import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getHealthStatus } from '../services/health.service.js';
import type { FastifyTypedInstance } from '../schemas/common.js';
import { API_ERRORS } from '../utils/errors.js';

const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string().datetime(),
  uptime: z.number(),
  environment: z.string(),
  services: z.object({
    database: z.object({
      status: z.enum(['connected', 'disconnected']),
      latency: z.number().optional(),
    }),
    mlService: z.object({
      status: z.enum(['reachable', 'unreachable']),
      url: z.string(),
    }),
  }),
});

export async function healthController(app: FastifyTypedInstance): Promise<void> {
  app.get('/', {
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Returns the current health status of the API and its dependencies',
      response: {
        200: HealthResponseSchema.describe('Service is healthy'),
        503: HealthResponseSchema.describe('Service is unhealthy'),
      },
    },
    handler: healthCheck,
  });
}

async function healthCheck(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  request.log.info('[health.controller.ts] healthCheck - Init');
  try {
    const health = await getHealthStatus(request.log);

    if (health.status === 'healthy') {
      request.log.info('[health.controller.ts] healthCheck - Success');
      reply.status(200).send(health);
    } else {
      request.log.warn('[health.controller.ts] healthCheck - Unhealthy dependencies');
      // Even if unhealthy, we usually return the health payload for diagnosis
      reply.status(API_ERRORS.HEALTH_CHECK_FAILED.statusCode).send(health);
    }
  } catch (error) {
    request.log.error({ error }, '[health.controller.ts] healthCheck - Error');
    reply.status(API_ERRORS.INTERNAL_SERVER_ERROR.statusCode).send(API_ERRORS.INTERNAL_SERVER_ERROR);
  }
}
