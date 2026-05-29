import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getInferencesService, type GetInferencesFilters } from '../services/inferences.service.js';

export async function inferencesController(app: FastifyInstance): Promise<void> {
  app.get('/', {
    schema: {
      tags: ['Inferences'],
      summary: 'Get inferences',
      description: 'Fetch inferences with optional filtering and pagination',
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date-time', description: 'ISO 8601 Date (e.g., 2026-01-01T00:00:00.000Z)' },
          endDate: { type: 'string', format: 'date-time', description: 'ISO 8601 Date' },
          modelName: { type: 'string', description: 'Filter by model used (e.g., yolo11)' },
          defectType: { type: 'string', description: 'Filter by specific defect class (e.g., mouse_bite)' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
        },
      },
    },
    handler: getInferencesHandler,
  });
}

async function getInferencesHandler(
  request: FastifyRequest<{ Querystring: GetInferencesFilters }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const filters = request.query;
    const result = await getInferencesService(filters);
    reply.status(200).send(result);
  } catch (error) {
    request.log.error(error);
    reply.status(500).send({ error: 'Failed to fetch inferences' });
  }
}
