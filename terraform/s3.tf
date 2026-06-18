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

# ──────────────────────────────────────────────────────────────────────
# Acesso Público de Leitura
#
# NOTA: idealmente, o acesso seria restrito e o frontend
# usaria Presigned URLs geradas pelo backend. Para o TCC, o acesso
# público simplifica a integração com o frontend local.
# ──────────────────────────────────────────────────────────────────────

# Desbloquear as proteções de acesso público
resource "aws_s3_bucket_public_access_block" "pcb_bucket_public" {
  bucket = aws_s3_bucket.pcb_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Política de leitura pública (s3:GetObject para qualquer objeto)
resource "aws_s3_bucket_policy" "pcb_bucket_policy" {
  bucket = aws_s3_bucket.pcb_bucket.id

  # Garante que o public access block já foi aplicado antes da policy
  depends_on = [aws_s3_bucket_public_access_block.pcb_bucket_public]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.pcb_bucket.arn}/*"
      }
    ]
  })
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

# ──────────────────────────────────────────────────────────────────────
# Configuração de CORS — Permite que o frontend web carregue imagens do
# S3 dentro de um elemento <canvas> (usando crossOrigin="anonymous")
# ──────────────────────────────────────────────────────────────────────
resource "aws_s3_bucket_cors_configuration" "pcb_bucket_cors" {
  bucket = aws_s3_bucket.pcb_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
