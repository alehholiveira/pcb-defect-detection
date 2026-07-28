import * as dotenv from "dotenv";
import { LAMBDA_ERRORS } from "../utils/errors.js";

// Attempts to load from .env in case it's running locally or packaged in the ZIP
dotenv.config();

export const env = {
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || "",
  SENDER_EMAIL: process.env.SENDER_EMAIL || "",
};

export function validateEnv() {
  console.log(`[env.js] validateEnv - Init`);
  if (!env.S3_BUCKET_NAME || !env.SENDER_EMAIL) {
    console.error(`[env.js] validateEnv - Error: Variáveis ausentes`);
    throw LAMBDA_ERRORS.MISSING_ENV_VARS;
  }
  console.log(`[env.js] validateEnv - Success`);
}
