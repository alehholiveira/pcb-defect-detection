import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { registerSwagger } from './plugins/swagger.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { env } from './config/index.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // --- Plugins ---
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
    },
  });

  await registerSwagger(app);

  // --- Routes ---
  await app.register(healthRoutes);

  // API prefix for future routes
  // await app.register(async (apiApp) => {
  //   await apiApp.register(analysisRoutes);
  //   await apiApp.register(reportRoutes);
  // }, { prefix: '/api/v1' });

  return app;
}
