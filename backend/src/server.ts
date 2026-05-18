import { buildApp } from './app.js';
import { env } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { registerModels } from './models/index.js';

async function start(): Promise<void> {
  try {
    // Register Sequelize models
    registerModels();

    // Connect to database
    await connectDatabase();

    // Build and start Fastify
    const app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    console.log(`🚀 Server running at http://${env.HOST}:${env.PORT}`);
    console.log(`📚 Swagger docs at http://${env.HOST}:${env.PORT}/docs`);
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

start();
