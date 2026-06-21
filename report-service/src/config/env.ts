import * as dotenv from "dotenv";

// Tenta carregar do .env caso esteja rodando localmente ou empacotado no ZIP
dotenv.config();

export const env = {
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || "",
  SENDER_EMAIL: process.env.SENDER_EMAIL || "",
};

export function validateEnv() {
  if (!env.S3_BUCKET_NAME || !env.SENDER_EMAIL) {
    throw new Error("Variáveis de ambiente ausentes: S3_BUCKET_NAME ou SENDER_EMAIL.");
  }
}
