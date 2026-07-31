import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getAllMetricsService } from '../services/metrics.service.js';
import type { FastifyTypedInstance } from '../schemas/common.js';
import { API_ERRORS } from '../utils/errors.js';

const GetMetricsQuerySchema = z.object({
  startDate: z.string().datetime().optional().describe('ISO 8601 Date (e.g., 2026-01-01T00:00:00.000Z)'),
  endDate: z.string().datetime().optional().describe('ISO 8601 Date'),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily').describe('Time series granularity'),
  modelName: z.string().optional().describe('Filter all metrics by model (e.g., yolo11)'),
});
export type GetMetricsFilters = z.infer<typeof GetMetricsQuerySchema>;

export async function metricsController(app: FastifyTypedInstance): Promise<void> {
  app.get('/', {
    schema: {
      tags: ['Metrics'],
      summary: 'Get system metrics',
      description: 'Get system metrics and dashboard data',
      querystring: GetMetricsQuerySchema,
    },
    handler: getMetricsHandler,
  });
}

async function getMetricsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const filters = request.query as GetMetricsFilters;
  request.log.info({ filters }, '[metrics.controller.ts] getMetricsHandler - Init');

  try {
    const metrics = await getAllMetricsService(filters, request.log);
    
    request.log.info('[metrics.controller.ts] getMetricsHandler - Success');
    reply.status(200).send(metrics);
  } catch (error) {
    request.log.error({ error }, '[metrics.controller.ts] getMetricsHandler - Error');
    reply.status(API_ERRORS.METRICS_FETCH_ERROR.statusCode).send(API_ERRORS.METRICS_FETCH_ERROR);
  }
}
