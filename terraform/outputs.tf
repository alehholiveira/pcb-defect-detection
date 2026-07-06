# ──────────────────────────────────────────────────────────────────────
# Outputs — valores úteis para integração com o backend local
# ──────────────────────────────────────────────────────────────────────

output "s3_bucket_name" {
  value       = aws_s3_bucket.pcb_bucket.id
  description = "Nome do bucket S3"
}

output "s3_bucket_arn" {
  value       = aws_s3_bucket.pcb_bucket.arn
  description = "ARN do bucket S3"
}

output "sqs_queue_url" {
  value       = aws_sqs_queue.pcb_report_queue.url
  description = "URL da fila SQS para relatórios manuais"
}

output "sqs_queue_arn" {
  value       = aws_sqs_queue.pcb_report_queue.arn
  description = "ARN da fila SQS"
}

output "sqs_dlq_url" {
  value       = aws_sqs_queue.pcb_report_dlq.url
  description = "URL da Dead Letter Queue"
}

output "lambda_function_name" {
  value       = aws_lambda_function.report_lambda.function_name
  description = "Nome da funcao Lambda"
}

output "lambda_arn" {
  value       = aws_lambda_function.report_lambda.arn
  description = "ARN da funcao Lambda"
}

output "eventbridge_rule_arn" {
  value       = aws_cloudwatch_event_rule.daily_report_schedule.arn
  description = "ARN da regra do EventBridge"
}

output "ses_sender_email" {
  value       = aws_ses_email_identity.sender.email
  description = "E-mail remetente verificado no SES"
}

output "eventbridge_daily_rule_name" {
  value       = aws_cloudwatch_event_rule.daily_report_schedule.name
  description = "Nome da regra diária"
}

output "eventbridge_weekly_rule_name" {
  value       = aws_cloudwatch_event_rule.weekly_report_schedule.name
  description = "Nome da regra semanal"
}

output "eventbridge_monthly_rule_name" {
  value       = aws_cloudwatch_event_rule.monthly_report_schedule.name
  description = "Nome da regra mensal"
}
