import { Op } from 'sequelize';
import type { FastifyBaseLogger } from 'fastify';
import { Inference, InferenceImage, Detection } from '../models/index.js';
import { sendReportRequest, type ReportQueuePayload } from '../aws/sqs.helper.js';
import { API_ERRORS } from '../utils/errors.js';
import type { GenerateReportBody } from '../controllers/reports.controller.js';

export async function generateReportService(body: GenerateReportBody, logger: FastifyBaseLogger) {
  logger.info({ body }, '[reports-generate.service.ts] generateReportService - Init');

  let inferenceIdsToProcess: number[] = [];

  // Scenario 1: User explicitly selected IDs
  if (body.selectedIds && body.selectedIds.length > 0) {
    inferenceIdsToProcess = body.selectedIds;
  } 
  // Scenario 2 & 3: User applied filters, potentially with some excluded IDs
  else if (body.filters) {
    const { startDate, endDate, modelName, defectType } = body.filters;
    
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

    // Fetch all matching IDs
    const inferences = await Inference.findAll({
      attributes: ['id'],
      where: inferenceWhere,
      include: [
        {
          model: InferenceImage,
          as: 'images',
          attributes: ['id'], // minimal payload
          required: !!defectType,
          include: [
            {
              model: Detection,
              as: 'detections',
              attributes: ['id'], // minimal payload
              where: defectType ? detectionWhere : undefined,
              required: !!defectType,
            },
          ],
        },
      ],
    });

    const allFilteredIds = inferences.map((inf: any) => inf.id as number);

    // Scenario 3: Remove excluded IDs
    if (body.excludedIds && body.excludedIds.length > 0) {
      const excludedSet = new Set(body.excludedIds);
      inferenceIdsToProcess = allFilteredIds.filter(id => !excludedSet.has(id));
    } else {
      inferenceIdsToProcess = allFilteredIds;
    }
  } else {
    // Should not happen due to Zod validation, but just in case
    logger.error('No selectedIds or filters provided');
    throw API_ERRORS.INVALID_REPORT_REQUEST;
  }

  if (inferenceIdsToProcess.length === 0) {
    logger.error('No inferences matched the request criteria');
    throw API_ERRORS.NO_INFERENCES_FOUND;
  }

  // Construct SQS payload
  const payload: ReportQueuePayload = {
    trigger_type: 'manual',
    report_type: 'manual',
    inference_ids: inferenceIdsToProcess,
    requested_by: 'manual',
  };

  try {
    const messageId = await sendReportRequest(payload);
    logger.info({ messageId, count: inferenceIdsToProcess.length }, '[reports-generate.service.ts] generateReportService - Success');
    
    return {
      message: 'Solicitação de relatório enviada com sucesso.',
      inferenceCount: inferenceIdsToProcess.length,
      messageId,
    };
  } catch (error) {
    logger.error({ error }, '[reports-generate.service.ts] generateReportService - Failed to send to SQS');
    throw API_ERRORS.GENERATE_REPORT_FAILED;
  }
}
