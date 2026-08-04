import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().default('pcb_defect_db'),
  DB_USER: z.string().default('pcb_user'),
  DB_PASSWORD: z.string().default('pcb_password'),

  // AWS
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET_NAME: z.string(),
  SQS_QUEUE_URL: z.string(),
  SENDER_EMAIL: z.string().email(),
  EVENTBRIDGE_DAILY_RULE_NAME: z.string().default('pcb-defect-detection-daily-report-rule'),
  EVENTBRIDGE_WEEKLY_RULE_NAME: z.string().default('pcb-defect-detection-weekly-report-rule'),
  EVENTBRIDGE_MONTHLY_RULE_NAME: z.string().default('pcb-defect-detection-monthly-report-rule'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Timezone
  APP_TIMEZONE: z.string().default('America/Sao_Paulo'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
type Env = z.infer<typeof envSchema>;
