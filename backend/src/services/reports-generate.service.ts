import { Op } from 'sequelize';
import type { FastifyBaseLogger } from 'fastify';
import { Inference, InferenceImage, Detection } from '../models/index.js';
import { sendReportRequest, type ReportQueuePayload, type InferenceReference } from '../aws/sqs.helper.js';
import { API_ERRORS } from '../utils/errors.js';
import type { GenerateReportBody } from '../controllers/reports.controller.js';

export async function generateReportService(body: GenerateReportBody, logger: FastifyBaseLogger) {
  logger.info({ reportName: body.reportName }, '[reports-generate.service.ts] generateReportService - Init');

  let inferenceIdsToProcess: number[] = [];
  let allFilteredInferences: { id: number; created_at: Date }[] = [];

  // Scenario 1: User explicitly selected IDs
  if (body.selectedIds && body.selectedIds.length > 0) {
    const inferences = await Inference.findAll({
      attributes: ['id', 'created_at'],
      where: { id: body.selectedIds },
    });
    allFilteredInferences = inferences.map((inf: any) => ({
      id: inf.id,
      created_at: inf.created_at,
    }));
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

    // Fetch all matching IDs and dates
    const inferences = await Inference.findAll({
      attributes: ['id', 'created_at'],
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

    allFilteredInferences = inferences.map((inf: any) => ({
      id: inf.id,
      created_at: inf.created_at,
    }));

    const allFilteredIds = allFilteredInferences.map(inf => inf.id);

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

  const inferenceIdsSet = new Set(inferenceIdsToProcess);
  const inferencesRef: InferenceReference[] = allFilteredInferences
    .filter(inf => inferenceIdsSet.has(inf.id))
    .map(inf => ({
      id: inf.id,
      date: inf.created_at.toISOString().split('T')[0],
    }));

  // Construct SQS payload
  const payload: ReportQueuePayload = {
    trigger_type: 'manual',
    report_type: 'manual',
    report_name: body.reportName,
    inferences: inferencesRef,
    requested_by: 'manual',
  };

  try {
    const messageId = await sendReportRequest(payload);
    logger.info({ messageId, count: inferencesRef.length }, '[reports-generate.service.ts] generateReportService - Success');
    
    return {
      message: 'Solicitação de relatório enviada com sucesso.',
      inferenceCount: inferencesRef.length,
      messageId,
    };
  } catch (error) {
    logger.error({ error }, '[reports-generate.service.ts] generateReportService - Failed to send to SQS');
    throw API_ERRORS.GENERATE_REPORT_FAILED;
  }
}
