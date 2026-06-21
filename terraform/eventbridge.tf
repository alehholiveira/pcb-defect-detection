# ──────────────────────────────────────────────────────────────────────
# EventBridge — Disparo diário e semanal dos relatórios
# ──────────────────────────────────────────────────────────────────────

# 1. Regra Diária
resource "aws_cloudwatch_event_rule" "daily_report_schedule" {
  name                = "${var.project_name}-daily-report-rule"
  description         = "Disparo diário para geração automática de relatórios (D-1)"
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "lambda_daily_target" {
  rule      = aws_cloudwatch_event_rule.daily_report_schedule.name
  target_id = "daily-report-lambda-target"
  arn       = aws_lambda_function.report_lambda.arn

  input = jsonencode({
    trigger_type = "scheduled"
    report_type  = "daily"
  })
}

resource "aws_lambda_permission" "allow_eventbridge_daily" {
  statement_id  = "AllowExecutionFromEventBridgeDaily"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.report_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_report_schedule.arn
}

# 2. Regra Semanal (Segunda-feira)
resource "aws_cloudwatch_event_rule" "weekly_report_schedule" {
  name                = "${var.project_name}-weekly-report-rule"
  description         = "Disparo semanal (toda segunda-feira) para relatórios (últimos 7 dias)"
  # Cron AWS: Minutes Hours Day-of-month Month Day-of-week Year
  # Dispara toda segunda-feira (2) à meia-noite UTC (ou seja, pega a semana passada inteira)
  schedule_expression = "cron(0 0 ? * 2 *)"
}

resource "aws_cloudwatch_event_target" "lambda_weekly_target" {
  rule      = aws_cloudwatch_event_rule.weekly_report_schedule.name
  target_id = "weekly-report-lambda-target"
  arn       = aws_lambda_function.report_lambda.arn

  input = jsonencode({
    trigger_type = "scheduled"
    report_type  = "weekly"
  })
}

resource "aws_lambda_permission" "allow_eventbridge_weekly" {
  statement_id  = "AllowExecutionFromEventBridgeWeekly"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.report_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_report_schedule.arn
}
