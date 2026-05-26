import { Sequelize } from 'sequelize';
import { env } from './index.js';
import { up as createInferenceTables } from '../migrations/01-create-inference-tables.js';

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
  } else {
    console.log('✅ Database tables already exist, skipping migrations.');
  }
}
