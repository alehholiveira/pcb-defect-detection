# ──────────────────────────────────────────────────────────────────────
# EventBridge — Disparo diário do relatório automático
# ──────────────────────────────────────────────────────────────────────
resource "aws_cloudwatch_event_rule" "daily_report_schedule" {
  name                = "${var.project_name}-daily-report-rule"
  description         = "Disparo diário para geração automática de relatórios de defeitos PCB"
  schedule_expression = "rate(1 day)"
}

# Alvo (Target) apontando para a Lambda
resource "aws_cloudwatch_event_target" "lambda_daily_target" {
  rule      = aws_cloudwatch_event_rule.daily_report_schedule.name
  target_id = "daily-report-lambda-target"
  arn       = aws_lambda_function.report_lambda.arn

  # Payload que identifica o tipo de disparo (diferencia do SQS manual)
  input = jsonencode({
    trigger_type = "scheduled"
    report_type  = "daily_summary"
  })
}

# Permissão para o EventBridge invocar a Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.report_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_report_schedule.arn
}
