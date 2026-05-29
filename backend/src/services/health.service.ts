import { sequelize } from '../config/database.js';
import { env } from '../config/index.js';

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
    mlService: {
      status: 'reachable' | 'unreachable';
      url: string;
    };
  };
}

export async function getHealthStatus(): Promise<HealthStatus> {
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
  } catch {
    dbStatus = 'disconnected';
  }

  // Check ML service reachability
  let mlStatus: 'reachable' | 'unreachable' = 'unreachable';
  try {
    const response = await fetch(`${env.ML_SERVICE_URL}/ml-service/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      mlStatus = 'reachable';
    }
  } catch {
    mlStatus = 'unreachable';
  }

  const isHealthy = dbStatus === 'connected';

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp,
    uptime,
    environment: env.NODE_ENV,
    services: {
      database: {
        status: dbStatus,
        latency: dbLatency,
      },
      mlService: {
        status: mlStatus,
        url: env.ML_SERVICE_URL,
      },
    },
  };
}
