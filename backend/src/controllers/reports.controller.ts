import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getReportsService } from '../services/reports.service.js';
import type { FastifyTypedInstance } from '../schemas/common.js';
import { API_ERRORS } from '../utils/errors.js';

export const GetReportsSchema = z.object({
  reportType: z.enum(['all', 'automatic', 'manual', 'daily', 'weekly', 'monthly']).default('all').describe('Filter by report type'),
  startDate: z.string().datetime().optional().describe('ISO 8601 Date (e.g., 2026-01-01T00:00:00.000Z)'),
  endDate: z.string().datetime().optional().describe('ISO 8601 Date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type GetReportsFilters = z.infer<typeof GetReportsSchema>;

export async function reportsController(app: FastifyTypedInstance): Promise<void> {
  app.get('/', {
    schema: {
      tags: ['Reports'],
      summary: 'Get reports',
      description: 'Fetch generated reports with optional filtering and pagination',
      querystring: GetReportsSchema,
    },
    handler: getReportsHandler,
  });
}

async function getReportsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const filters = request.query as GetReportsFilters;
  request.log.info({ filters }, '[reports.controller.ts] getReportsHandler - Init');

  try {
    const result = await getReportsService(filters, request.log);
    request.log.info('[reports.controller.ts] getReportsHandler - Success');
    reply.status(200).send(result);
  } catch (error) {
    request.log.error({ error }, '[reports.controller.ts] getReportsHandler - Error');
    reply.status(API_ERRORS.FETCH_REPORTS_FAILED.statusCode).send(API_ERRORS.FETCH_REPORTS_FAILED);
  }
}
