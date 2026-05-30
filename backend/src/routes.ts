import type { FastifyTypedInstance } from './schemas/common.js';
import { healthController } from './controllers/health.controller.js';
import { inferencesController } from './controllers/inferences.controller.js';

export async function appRoutes(app: FastifyTypedInstance): Promise<void> {
  // System routes
  app.register(healthController, { prefix: '/health' });

  // API v1 routes
  app.register(async (api) => {
    api.register(inferencesController, { prefix: '/inferences' });
  }, { prefix: '/api/v1' });
}
