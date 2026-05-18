import type { FastifyInstance } from 'fastify';
import { healthCheck } from './health.controller.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', {
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
