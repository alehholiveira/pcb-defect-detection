import { Op } from 'sequelize';
import { Inference, InferenceImage, Detection } from '../models/index.js';

export interface GetInferencesFilters {
  startDate?: string;
  endDate?: string;
  modelName?: string;
  defectType?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export async function getInferencesService(filters: GetInferencesFilters) {
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
      // To include the entire end date, it's often good to add time or let the user pass ISO strings
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

  return {
    data: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}
