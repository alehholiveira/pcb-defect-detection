import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getInferencesService, getInferenceByIdService, deleteInferenceService } from '../services/inferences.service.js';
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

export const GetInferenceByIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

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

  app.get('/:id', {
    schema: {
      tags: ['Inferences'],
      summary: 'Get inference by ID',
      description: 'Fetch a single inference by its ID, including all images and detections',
      params: GetInferenceByIdSchema,
    },
    handler: getInferenceByIdHandler,
  });

  app.delete('/:id', {
    schema: {
      tags: ['Inferences'],
      summary: 'Delete inference by ID',
      description: 'Delete a single inference and its associated records by ID',
      params: GetInferenceByIdSchema,
    },
    handler: deleteInferenceHandler,
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

async function getInferenceByIdHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params as z.infer<typeof GetInferenceByIdSchema>;
  request.log.info({ id }, '[inferences.controller.ts] getInferenceByIdHandler - Init');

  try {
    // getInferenceByIdService is missing from imports, need to add it above!
    const result = await getInferenceByIdService(id, request.log);
    if (!result) {
      reply.status(API_ERRORS.RESOURCE_NOT_FOUND.statusCode).send(API_ERRORS.RESOURCE_NOT_FOUND);
      return;
    }
    request.log.info('[inferences.controller.ts] getInferenceByIdHandler - Success');
    reply.status(200).send(result);
  } catch (error) {
    request.log.error({ error }, '[inferences.controller.ts] getInferenceByIdHandler - Error');
    reply.status(API_ERRORS.INTERNAL_SERVER_ERROR.statusCode).send(API_ERRORS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Deletes a single inference and its associated records by ID.
 * 
 * Note: We do NOT explicitly delete the associated image files from S3 here.
 * Instead, S3 lifecycle rules are configured on the bucket to automatically
 * clean up and expire objects after a designated period. This keeps the backend
 * logic simpler and reduces the number of synchronous AWS API calls during deletion.
 */
async function deleteInferenceHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params as z.infer<typeof GetInferenceByIdSchema>;
  request.log.info({ id }, '[inferences.controller.ts] deleteInferenceHandler - Init');

  try {
    const deleted = await deleteInferenceService(id, request.log);
    if (!deleted) {
      reply.status(API_ERRORS.RESOURCE_NOT_FOUND.statusCode).send(API_ERRORS.RESOURCE_NOT_FOUND);
      return;
    }
    request.log.info('[inferences.controller.ts] deleteInferenceHandler - Success');
    reply.status(204).send();
  } catch (error) {
    request.log.error({ error }, '[inferences.controller.ts] deleteInferenceHandler - Error');
    reply.status(API_ERRORS.INTERNAL_SERVER_ERROR.statusCode).send(API_ERRORS.INTERNAL_SERVER_ERROR);
  }
}


