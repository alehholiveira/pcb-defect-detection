import { Sequelize } from 'sequelize';
import { env } from './index.js';
import { up as createInferenceTables } from '../migrations/01-create-inference-tables.js';
import { up as createSystemSettings } from '../migrations/02-create-system-settings.js';
import { up as createRecipientEmails } from '../migrations/03-create-recipient-emails.js';

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  logging: env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
  /**
   * Connection pool settings optimized to handle bursty traffic from inference operations.
   * - max: Maximum 10 concurrent connections to avoid overwhelming the database.
   * - acquire: Allows up to 30s to acquire a connection before throwing a timeout error.
   * - idle: Closes connections that have been idle for 10s to free up resources.
   */
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Run programmatic migrations
    await runMigrations();
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();

  // Check if tables already exist before running migration
  const tables = await queryInterface.showAllTables();

  if (!tables.includes('inferences')) {
    console.log('🔄 Running migration: 01-create-inference-tables...');
    await createInferenceTables(queryInterface);
    console.log('✅ Migration completed: inference tables created.');
  }

  if (!tables.includes('system_settings')) {
    console.log('🔄 Running migration: 02-create-system-settings...');
    await createSystemSettings(queryInterface);
    console.log('✅ Migration completed: system_settings created.');
  }

  if (!tables.includes('recipient_emails')) {
    console.log('🔄 Running migration: 03-create-recipient-emails...');
    await createRecipientEmails(queryInterface);
    console.log('✅ Migration completed: recipient_emails created.');
  }

  if (tables.includes('inferences') && tables.includes('system_settings') && tables.includes('recipient_emails')) {
    console.log('✅ Database tables already exist, skipping migrations.');
  }
}
