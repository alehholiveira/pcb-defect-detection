# ──────────────────────────────────────────────────────────────────────
# Locals
# ──────────────────────────────────────────────────────────────────────
locals {
  lambda_function_name = "${var.project_name}-report-service"
  lambda_source_dir    = "${path.module}/lambda_report"
}

# ──────────────────────────────────────────────────────────────────────
# Referência aos ZIPs de layer e código.
# ──────────────────────────────────────────────────────────────────────

resource "aws_lambda_layer_version" "dependencies" {
  filename            = "${path.module}/lambda_layer.zip"
  source_code_hash    = filebase64sha256("${path.module}/lambda_layer.zip")
  layer_name          = "${var.project_name}-layer"
  compatible_runtimes = ["nodejs24.x"]
  description         = "Dependencias da Lambda"
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
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.sender_email
          }
        }
      },
      # SES — Listar e consultar status de verificação de identidades
      {
        Sid    = "SESListAndRead"
        Effect = "Allow"
        Action = [
          "ses:GetIdentityVerificationAttributes",
          "ses:ListIdentities"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attach" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# ──────────────────────────────────────────────────────────────────────
# Lambda Function — Node.js 24
# ──────────────────────────────────────────────────────────────────────
resource "aws_lambda_function" "report_lambda" {
  filename         = "${path.module}/lambda_function.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_function.zip")
  function_name    = local.lambda_function_name
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "src/index.handler"
  runtime          = "nodejs24.x"

  # Lambda Layer base (as versões atualizadas serão gerenciadas pelo Terraform)
  layers = [aws_lambda_layer_version.dependencies.arn]

  # Dimensionamento frugal (Cost Optimization Pillar)
  memory_size = 512
  timeout     = 60

  # Nenhuma variável de ambiente necessária no Terraform,
  # pois o `.env` é empacotado junto com o código.

  depends_on = [
    aws_iam_role_policy_attachment.lambda_policy_attach,
    aws_cloudwatch_log_group.lambda_logs
  ]
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
