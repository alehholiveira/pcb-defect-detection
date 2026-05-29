import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getHealthStatus } from '../services/health.service.js';

export async function healthController(app: FastifyInstance): Promise<void> {
  app.get('/', {
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Returns the current health status of the API and its dependencies',
      response: {
        200: {
          type: 'object',
          description: 'Service is healthy',
          properties: {
            status: { type: 'string', enum: ['healthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            environment: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['connected', 'disconnected'] },
                    latency: { type: 'number' },
                  },
                },
                mlService: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['reachable', 'unreachable'] },
                    url: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        503: {
          type: 'object',
          description: 'Service is unhealthy',
          properties: {
            status: { type: 'string', enum: ['unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            environment: { type: 'string' },
            services: { type: 'object' },
          },
        },
      },
    },
    handler: healthCheck,
  });
}

async function healthCheck(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const health = await getHealthStatus();

  const statusCode = health.status === 'healthy' ? 200 : 503;
  reply.status(statusCode).send(health);
}
