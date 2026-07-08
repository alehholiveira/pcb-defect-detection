import type { FastifyTypedInstance } from './schemas/common.js';
import { healthController } from './controllers/health.controller.js';
import { inferencesController } from './controllers/inferences.controller.js';
import { reportsController } from './controllers/reports.controller.js';
import { metricsController } from './controllers/metrics.controller.js';
import { settingsController } from './controllers/settings.controller.js';

export async function appRoutes(app: FastifyTypedInstance): Promise<void> {
  // System routes
  app.register(healthController, { prefix: '/health' });

  // API v1 routes
  app.register(async (api) => {
    api.register(inferencesController, { prefix: '/inferences' });
    api.register(reportsController, { prefix: '/reports' });
    api.register(metricsController, { prefix: '/metrics' });
    api.register(settingsController, { prefix: '/settings' });
  }, { prefix: '/api/v1' });
}
