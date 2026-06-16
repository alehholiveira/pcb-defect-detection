# ──────────────────────────────────────────────────────────────────────
# Amazon SES — Verificação de identidade do e-mail remetente
#
# NOTA SOBRE O MODO SANDBOX:
# Contas SES novas iniciam em modo Sandbox. Nesse modo:
#   - Apenas e-mails verificados podem ENVIAR e RECEBER mensagens.
#   - Para enviar para destinatários arbitrários (não verificados),
#     é necessário solicitar "Production Access" via console do SES.
#
# Para o TCC, os destinatários de teste podem ser verificados
# manualmente no console do SES em: SES > Verified Identities > Create.
# ──────────────────────────────────────────────────────────────────────

# Identidade do e-mail remetente (envio de relatórios)
resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}
