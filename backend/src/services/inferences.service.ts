import { Op } from 'sequelize';
import { Inference, InferenceImage, Detection } from '../models/index.js';
import type { GetInferencesFilters } from '../controllers/inferences.controller.js';
import type { FastifyBaseLogger } from 'fastify';

export async function getInferencesService(filters: GetInferencesFilters, logger: FastifyBaseLogger) {
  logger.info({ filters }, '[inferences.service.ts] getInferencesService - Init');

  const {
    startDate,
    endDate,
    modelName,
    defectType,
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = filters;

  const offset = (page - 1) * limit;

  const inferenceWhere: any = {};
  if (startDate || endDate) {
    inferenceWhere.created_at = {};
    if (startDate) {
      inferenceWhere.created_at[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      inferenceWhere.created_at[Op.lte] = new Date(endDate);
    }
  }

  if (modelName) {
    inferenceWhere.model_name = modelName;
  }

  const detectionWhere: any = {};
  if (defectType) {
    detectionWhere.class_name = defectType;
  }

  const { rows, count } = await Inference.findAndCountAll({
    where: inferenceWhere,
    distinct: true, // Important when using includes with hasMany
    include: [
      {
        model: InferenceImage,
        as: 'images',
        required: !!defectType, // If filtering by defectType, we require at least one matching image
        include: [
          {
            model: Detection,
            as: 'detections',
            where: defectType ? detectionWhere : undefined,
            required: !!defectType, // If filtering by defectType, we require the detection to match
          },
        ],
      },
    ],
    order: [['created_at', sortOrder.toUpperCase()]],
    limit,
    offset,
  });

  const totalPages = Math.ceil(count / limit);
  logger.info(
    { count, page, totalPages },
    '[inferences.service.ts] getInferencesService - Success'
  );

  return {
    data: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages,
    },
  };
}
