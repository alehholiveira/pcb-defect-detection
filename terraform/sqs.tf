# ──────────────────────────────────────────────────────────────────────
# Fila SQS principal — recebe solicitações de relatórios manuais
# ──────────────────────────────────────────────────────────────────────
resource "aws_sqs_queue" "pcb_report_queue" {
  name                      = "${var.project_name}-report-queue"
  delay_seconds             = 0
  max_message_size          = 262144 # 256 KB
  message_retention_seconds = 86400  # 24h (frugal: limpa mensagens antigas)
  receive_wait_time_seconds = 20     # Long Polling (Cost Optimization Pillar)

  # Redirecionar mensagens com falha para a Dead Letter Queue
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.pcb_report_dlq.arn
    maxReceiveCount     = 3 # Após 3 tentativas fracassadas, move para a DLQ
  })
}

# ──────────────────────────────────────────────────────────────────────
# Dead Letter Queue (DLQ) — armazena mensagens que falharam no processamento
# Evita loops infinitos de retentativa na Lambda (Reliability Pillar)
# ──────────────────────────────────────────────────────────────────────
resource "aws_sqs_queue" "pcb_report_dlq" {
  name                      = "${var.project_name}-report-dlq"
  message_retention_seconds = 1209600 # 14 dias (tempo para análise manual de falhas)
}
