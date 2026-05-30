import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getInferencesService } from '../services/inferences.service.js';
import type { FastifyTypedInstance } from '../schemas/common.js';
import { API_ERRORS } from '../utils/errors.js';

export const GetInferencesSchema = z.object({
  startDate: z.string().datetime().optional().describe('ISO 8601 Date (e.g., 2026-01-01T00:00:00.000Z)'),
  endDate: z.string().datetime().optional().describe('ISO 8601 Date'),
  modelName: z.string().optional().describe('Filter by model used (e.g., yolo11)'),
  defectType: z.string().optional().describe('Filter by specific defect class (e.g., mouse_bite)'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type GetInferencesFilters = z.infer<typeof GetInferencesSchema>;

export async function inferencesController(app: FastifyTypedInstance): Promise<void> {
  app.get('/', {
    schema: {
      tags: ['Inferences'],
      summary: 'Get inferences',
      description: 'Fetch inferences with optional filtering and pagination',
      querystring: GetInferencesSchema,
    },
    handler: getInferencesHandler,
  });
}

async function getInferencesHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Validate and type the query
  const filters = request.query as GetInferencesFilters;
  request.log.info({ filters }, '[inferences.controller.ts] getInferencesHandler - Init');

  try {
    const result = await getInferencesService(filters, request.log);
    request.log.info('[inferences.controller.ts] getInferencesHandler - Success');
    reply.status(200).send(result);
  } catch (error) {
    request.log.error({ error }, '[inferences.controller.ts] getInferencesHandler - Error');
    reply.status(API_ERRORS.FETCH_INFERENCES_FAILED.statusCode).send(API_ERRORS.FETCH_INFERENCES_FAILED);
  }
}
