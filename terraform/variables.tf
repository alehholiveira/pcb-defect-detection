variable "aws_region" {
  type        = string
  description = "Região da AWS para deploy dos recursos"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Nome do projeto (usado como prefixo de nomeação dos recursos)"
  default     = "pcb-defect-detection"
}

variable "sender_email" {
  type        = string
  description = "E-mail remetente verificado no SES para envio dos relatórios"
}
