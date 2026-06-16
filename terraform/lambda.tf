# ──────────────────────────────────────────────────────────────────────
# Locals
# ──────────────────────────────────────────────────────────────────────
locals {
  lambda_function_name = "${var.project_name}-report-service"
  lambda_source_dir    = "${path.module}/src/lambda_report"
}

# ──────────────────────────────────────────────────────────────────────
# Criação de ZIPs "dummy" para o deploy inicial da infraestrutura
#
# Como o código e a layer serão gerenciados e atualizados manualmente
# via AWS Console (ou SAM), o Terraform precisa apenas de um pacote
# inicial válido para criar os recursos (o "casco" da infraestrutura).
# ──────────────────────────────────────────────────────────────────────

data "archive_file" "dummy_lambda" {
  type        = "zip"
  output_path = "${path.module}/dummy_lambda.zip"
  source {
    content  = "exports.handler = async (event) => { console.log('Placeholder'); return { statusCode: 200, body: 'Dummy' }; };"
    filename = "index.js"
  }
}

data "archive_file" "dummy_layer" {
  type        = "zip"
  output_path = "${path.module}/dummy_layer.zip"
  source {
    content  = "{}"
    filename = "nodejs/package.json"
  }
}

resource "aws_lambda_layer_version" "dependencies" {
  filename            = data.archive_file.dummy_layer.output_path
  source_code_hash    = data.archive_file.dummy_layer.output_base64sha256
  layer_name          = "${var.project_name}-dependencies"
  compatible_runtimes = ["nodejs24.x"]
  description         = "Dependencias de producao da Lambda (Gerenciado Manualmente)"
}

# ──────────────────────────────────────────────────────────────────────
# CloudWatch Log Group — retenção de 7 dias (Cost Optimization Pillar)
# Criado explicitamente para controlar a retenção e evitar logs
# acumulados indefinidamente com custo de armazenamento.
# ──────────────────────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${local.lambda_function_name}"
  retention_in_days = 7
}

# ──────────────────────────────────────────────────────────────────────
# IAM Role — identidade que a Lambda assume para executar
# ──────────────────────────────────────────────────────────────────────
resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRole"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# ──────────────────────────────────────────────────────────────────────
# IAM Policy — Least Privilege (Security Pillar)
# Cada Statement concede apenas as permissões mínimas necessárias,
# com escopo restrito aos ARNs específicos dos recursos deste projeto.
# ──────────────────────────────────────────────────────────────────────
resource "aws_iam_policy" "lambda_policy" {
  name        = "${var.project_name}-lambda-policy"
  description = "Permissoes minimas para a Lambda de relatorios PCB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudWatch Logs — escopo restrito ao log group desta Lambda
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.lambda_logs.arn}:*"
      },
      # S3 — ler dados estruturados e salvar relatórios PDF
      {
        Sid    = "S3ReadWrite"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.pcb_bucket.arn,
          "${aws_s3_bucket.pcb_bucket.arn}/*"
        ]
      },
      # SQS — consumir mensagens da fila principal
      {
        Sid    = "SQSConsume"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.pcb_report_queue.arn
      },
      # SES — enviar e-mails de relatório
      {
        Sid    = "SESSend"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = aws_ses_email_identity.sender.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attach" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# ──────────────────────────────────────────────────────────────────────
# Lambda Function — Node.js 24 (nativo)
# ──────────────────────────────────────────────────────────────────────
resource "aws_lambda_function" "report_lambda" {
  filename         = data.archive_file.dummy_lambda.output_path
  source_code_hash = data.archive_file.dummy_lambda.output_base64sha256
  function_name    = local.lambda_function_name
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "index.handler"
  runtime          = "nodejs24.x"

  # Lambda Layer base (as versões atualizadas serão gerenciadas manualmente)
  layers = [aws_lambda_layer_version.dependencies.arn]

  # Dimensionamento frugal (Cost Optimization Pillar)
  memory_size = 256 # 256MB — suficiente para gerar PDFs
  timeout     = 30  # 30s — interrompe execuções travadas

  environment {
    variables = {
      S3_BUCKET_NAME = aws_s3_bucket.pcb_bucket.id
      SQS_QUEUE_URL  = aws_sqs_queue.pcb_report_queue.url
      SENDER_EMAIL   = var.sender_email
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_policy_attach,
    aws_cloudwatch_log_group.lambda_logs
  ]

  # Ignora as mudanças caso você suba novos códigos ou layers manualmente no Console
  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      layers
    ]
  }
}

# ──────────────────────────────────────────────────────────────────────
# Event Source Mapping — SQS → Lambda (trigger de relatórios manuais)
# ──────────────────────────────────────────────────────────────────────
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.pcb_report_queue.arn
  function_name    = aws_lambda_function.report_lambda.arn
  batch_size       = 5
  enabled          = true
}
