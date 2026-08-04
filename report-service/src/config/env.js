import * as dotenv from "dotenv";
import { LAMBDA_ERRORS } from "../utils/errors.js";

// Attempts to load from .env in case it's running locally or packaged in the ZIP
dotenv.config();

export const env = {
  AWS_REGION: process.env.AWS_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  SENDER_EMAIL: process.env.SENDER_EMAIL,
  DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE,
  APP_TIMEZONE: process.env.APP_TIMEZONE
};

export function validateEnv() {
  console.log(`[env.js] validateEnv - Init`);
  if (!env.S3_BUCKET_NAME || !env.SENDER_EMAIL) {
    console.error(`[env.js] validateEnv - Error: Variáveis ausentes`);
    throw LAMBDA_ERRORS.MISSING_ENV_VARS;
  }
  if (env.DEFAULT_LANGUAGE !== "pt-BR" && env.DEFAULT_LANGUAGE !== "en") {
    console.warn(`[env.js] validateEnv - Warning: DEFAULT_LANGUAGE inválido (${env.DEFAULT_LANGUAGE}), usando pt-BR como fallback.`);
    env.DEFAULT_LANGUAGE = "pt-BR";
  }
  if (!env.APP_TIMEZONE) {
    console.warn(`[env.js] validateEnv - Warning: APP_TIMEZONE inválido (${env.APP_TIMEZONE}), usando "America/Sao_Paulo" como fallback.`);
    env.APP_TIMEZONE = "America/Sao_Paulo";
  }
  console.log(`[env.js] validateEnv - Success`);
}
