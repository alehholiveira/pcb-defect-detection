import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import { Sequelize } from 'sequelize';
import { registerModels } from '../../src/models/index.js';
import { up as createInferenceTables } from '../../src/migrations/01-create-inference-tables.js';
import { up as createSystemSettings } from '../../src/migrations/02-create-system-settings.js';
import { up as createRecipientEmails } from '../../src/migrations/03-create-recipient-emails.js';

let container: StartedMySqlContainer | null = null;
let testSequelize: Sequelize | null = null;

export async function setupTestDatabase() {
  if (testSequelize && container) {
    return { container, sequelize: testSequelize };
  }

  // Set dummy required env vars before loading config/app
  process.env.NODE_ENV = 'test';
  process.env.S3_BUCKET_NAME = 'test-bucket';
  process.env.SQS_QUEUE_URL = 'http://localhost:4566/000000000000/test-queue';

  container = await new MySqlContainer('mysql:8.0')
    .withDatabase('pcb_test_db')
    .withUsername('test_user')
    .withUserPassword('test_password')
    .withRootPassword('root_password')
    .start();

  process.env.DB_HOST = container.getHost();
  process.env.DB_PORT = container.getPort().toString();
  process.env.DB_NAME = container.getDatabase();
  process.env.DB_USER = container.getUsername();
  process.env.DB_PASSWORD = container.getUserPassword();

  const { sequelize } = await import('../../src/config/database.js');
  testSequelize = sequelize;

  // Dynamically update connection parameters on existing sequelize instance
  (testSequelize.config as any).host = container.getHost();
  (testSequelize.config as any).port = container.getPort();
  (testSequelize.config as any).database = container.getDatabase();
  (testSequelize.config as any).username = container.getUsername();
  (testSequelize.config as any).password = container.getUserPassword();

  (testSequelize.options as any).host = container.getHost();
  (testSequelize.options as any).port = container.getPort();
  (testSequelize.options as any).database = container.getDatabase();
  (testSequelize.options as any).username = container.getUsername();
  (testSequelize.options as any).password = container.getUserPassword();

  if ((testSequelize as any).connectionManager?.config) {
    (testSequelize as any).connectionManager.config.host = container.getHost();
    (testSequelize as any).connectionManager.config.port = container.getPort();
    (testSequelize as any).connectionManager.config.database = container.getDatabase();
    (testSequelize as any).connectionManager.config.username = container.getUsername();
    (testSequelize as any).connectionManager.config.password = container.getUserPassword();
  }

  await testSequelize.authenticate();
  registerModels();

  const qi = testSequelize.getQueryInterface();
  await createInferenceTables(qi);
  await createSystemSettings(qi);
  await createRecipientEmails(qi);

  return { container, sequelize: testSequelize };
}

export async function teardownTestDatabase() {
  if (testSequelize) {
    await testSequelize.close();
    testSequelize = null;
  }
  if (container) {
    await container.stop();
    container = null;
  }
}

export async function cleanDatabase() {
  if (!testSequelize) return;
  const qi = testSequelize.getQueryInterface();

  await testSequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
  await qi.bulkDelete('detections', {});
  await qi.bulkDelete('inference_images', {});
  await qi.bulkDelete('inferences', {});
  await qi.bulkDelete('recipient_emails', {});
  await qi.bulkDelete('system_settings', {});
  await testSequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

  await qi.bulkInsert('system_settings', [
    {
      key: 'report_schedule_daily',
      value: 'true',
      description: 'Enable daily report generation',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      key: 'report_schedule_weekly',
      value: 'true',
      description: 'Enable weekly report generation',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      key: 'report_schedule_monthly',
      value: 'true',
      description: 'Enable monthly report generation',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}
