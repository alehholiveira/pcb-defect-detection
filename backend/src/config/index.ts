import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DB_HOST: z.string().default('db'),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().default('pcb_defect_db'),
  DB_USER: z.string().default('pcb_user'),
  DB_PASSWORD: z.string().default('pcb_password'),

  // ML Service
  ML_SERVICE_URL: z.string().default('http://ml-service:8000'),

  // AWS
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET_NAME: z.string(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
