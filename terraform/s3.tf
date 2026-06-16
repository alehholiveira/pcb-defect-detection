# ──────────────────────────────────────────────────────────────────────
# Sufixo aleatório para garantir unicidade global do nome do bucket
# ──────────────────────────────────────────────────────────────────────
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# ──────────────────────────────────────────────────────────────────────
# Bucket S3 — armazena imagens originais de inspeção e relatórios PDF
# ──────────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "pcb_bucket" {
  bucket        = "${var.project_name}-${random_string.suffix.result}"
  force_destroy = true # Permite terraform destroy mesmo com arquivos dentro
}

# Bloquear qualquer forma de acesso público (Well-Architected: Security Pillar)
resource "aws_s3_bucket_public_access_block" "pcb_bucket_public" {
  bucket = aws_s3_bucket.pcb_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Regra de Ciclo de Vida — apaga objetos após 7 dias (Cost Optimization Pillar)
resource "aws_s3_bucket_lifecycle_configuration" "pcb_bucket_lifecycle" {
  bucket = aws_s3_bucket.pcb_bucket.id

  rule {
    id     = "expire-after-7-days"
    status = "Enabled"

    filter {} # Aplicar a todos os objetos do bucket

    expiration {
      days = 7
    }
  }
}
