import { sequelize } from '../config/database.js';
import { env } from '../config/index.js';
import type { FastifyBaseLogger } from 'fastify';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      latency?: number;
    };
  };
}

export async function getHealthStatus(logger: FastifyBaseLogger): Promise<HealthStatus> {
  logger.info('[health.service.ts] getHealthStatus - Init');
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();

  // Check database connection
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  let dbLatency: number | undefined;
  try {
    const start = Date.now();
    await sequelize.authenticate();
    dbLatency = Date.now() - start;
    dbStatus = 'connected';
  } catch (error) {
    logger.error({ error }, '[health.service.ts] getHealthStatus - DB Connection failed');
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';
  
  const result: HealthStatus = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp,
    uptime,
    environment: env.NODE_ENV,
    services: {
      database: {
        status: dbStatus,
        latency: dbLatency,
      },
    },
  };

  if (isHealthy) {
    logger.info('[health.service.ts] getHealthStatus - Success (Healthy)');
  } else {
    logger.warn('[health.service.ts] getHealthStatus - Completed with Unhealthy status');
  }

  return result;
}
