import { Op, fn, col, literal } from 'sequelize';
import type { FastifyBaseLogger } from 'fastify';
import { Inference, InferenceImage, Detection } from '../models/index.js';
import { getReportsService } from './reports.service.js';
import type { GetMetricsFilters } from '../controllers/metrics.controller.js';

function buildInferenceWhere(filters: GetMetricsFilters) {
  const where: any = {};
  if (filters.startDate || filters.endDate) {
    where.created_at = {};
    if (filters.startDate) where.created_at[Op.gte] = new Date(filters.startDate);
    if (filters.endDate) where.created_at[Op.lte] = new Date(filters.endDate);
  }
  if (filters.modelName) {
    where.model_name = filters.modelName;
  }
  return where;
}

export async function getSummaryMetricsService(filters: GetMetricsFilters, logger: FastifyBaseLogger) {
  logger.info({ filters }, '[metrics.service.ts] getSummaryMetricsService - Init');
  const where = buildInferenceWhere(filters);
  
  const inferenceStats = await Inference.findOne({
    where,
    attributes: [
      [fn('COUNT', col('id')), 'totalInferences'],
      [fn('SUM', col('total_detections')), 'totalDefects'],
      [fn('AVG', col('inference_time_ms')), 'avgInferenceTimeMs'],
    ],
    raw: true,
  }) as any;

  const totalImages = await InferenceImage.count({
    include: [{
      model: Inference,
      as: 'inference',
      where,
      required: true,
      attributes: []
    }]
  });

  const confidenceStats = await Detection.findOne({
    include: [{
      model: InferenceImage,
      as: 'inferenceImage',
      required: true,
      attributes: [],
      include: [{
        model: Inference,
        as: 'inference',
        where,
        required: true,
        attributes: []
      }]
    }],
    attributes: [
      [fn('AVG', col('confidence')), 'avgConfidence']
    ],
    raw: true,
  }) as any;

  const totalInferences = parseInt(inferenceStats?.totalInferences || '0', 10);
  const totalDefects = parseInt(inferenceStats?.totalDefects || '0', 10);
  const avgInferenceTimeMs = parseFloat(inferenceStats?.avgInferenceTimeMs || '0');
  const avgConfidence = parseFloat(confidenceStats?.avgConfidence || '0');
  
  let defectRate = 0;
  if (totalImages > 0) {
    defectRate = totalDefects / totalImages;
  }

  logger.info('[metrics.service.ts] getSummaryMetricsService - Success');
  return {
    totalInferences,
    totalImages,
    totalDefects,
    avgConfidence,
    avgInferenceTimeMs,
    defectRate
  };
}

export async function getTimeSeriesMetricsService(filters: GetMetricsFilters, logger: FastifyBaseLogger) {
  logger.info({ filters }, '[metrics.service.ts] getTimeSeriesMetricsService - Init');
  const where = buildInferenceWhere(filters);
  const granularity = filters.granularity || 'daily';
  
  let dateFormatExpr = 'DATE(Inference.created_at)';
  if (granularity === 'weekly') {
    dateFormatExpr = `DATE_FORMAT(DATE_SUB(Inference.created_at, INTERVAL WEEKDAY(Inference.created_at) DAY), '%Y-%m-%d')`;
  } else if (granularity === 'monthly') {
    dateFormatExpr = `DATE_FORMAT(Inference.created_at, '%Y-%m-01')`;
  }

  const inferencesOverTime = await Inference.findAll({
    where,
    attributes: [
      [literal(dateFormatExpr), 'date'],
      [fn('COUNT', col('id')), 'count']
    ],
    group: [literal('date') as any],
    order: [[literal('date'), 'ASC']],
    raw: true,
  }) as any[];

  // Fix: backtick escape the alias to avoid MySQL interpreting -> as a JSON operator
  let detectionDateFormatExpr = 'DATE(`inferenceImage->inference`.`created_at`)';
  if (granularity === 'weekly') {
    detectionDateFormatExpr = `DATE_FORMAT(DATE_SUB(\`inferenceImage->inference\`.\`created_at\`, INTERVAL WEEKDAY(\`inferenceImage->inference\`.\`created_at\`) DAY), '%Y-%m-%d')`;
  } else if (granularity === 'monthly') {
    detectionDateFormatExpr = `DATE_FORMAT(\`inferenceImage->inference\`.\`created_at\`, '%Y-%m-01')`;
  }

  const defectsAndConfidenceOverTime = await Detection.findAll({
    include: [{
      model: InferenceImage,
      as: 'inferenceImage',
      required: true,
      attributes: [],
      include: [{
        model: Inference,
        as: 'inference',
        where,
        required: true,
        attributes: []
      }]
    }],
    attributes: [
      [literal(detectionDateFormatExpr), 'date'],
      [fn('COUNT', col('Detection.id')), 'count'],
      [fn('AVG', col('Detection.confidence')), 'avgConfidence']
    ],
    group: [literal('date') as any],
    order: [[literal('date'), 'ASC']],
    raw: true,
  }) as any[];

  const defectRateOverTime = defectsAndConfidenceOverTime.map(dRow => {
      const infRow = inferencesOverTime.find(iRow => iRow.date === dRow.date);
      return {
          date: dRow.date,
          rate: infRow && parseInt(infRow.count, 10) > 0 ? (parseInt(dRow.count, 10) / parseInt(infRow.count, 10)) : 0
      };
  });

  logger.info('[metrics.service.ts] getTimeSeriesMetricsService - Success');
  return {
    inferencesOverTime: inferencesOverTime.map(row => ({
      date: row.date,
      count: parseInt(row.count, 10)
    })),
    defectsOverTime: defectsAndConfidenceOverTime.map(row => ({
      date: row.date,
      count: parseInt(row.count, 10)
    })),
    avgConfidenceOverTime: defectsAndConfidenceOverTime.map(row => ({
      date: row.date,
      avgConfidence: parseFloat(row.avgConfidence || '0')
    })),
    defectRateOverTime
  };
}

export async function getDefectDistributionService(filters: GetMetricsFilters, logger: FastifyBaseLogger) {
  logger.info({ filters }, '[metrics.service.ts] getDefectDistributionService - Init');
  const where = buildInferenceWhere(filters);
  
  const distribution = await Detection.findAll({
    include: [{
      model: InferenceImage,
      as: 'inferenceImage',
      required: true,
      attributes: [],
      include: [{
        model: Inference,
        as: 'inference',
        where,
        required: true,
        attributes: []
      }]
    }],
    attributes: [
      ['class_name', 'type'],
      [fn('COUNT', col('Detection.id')), 'count']
    ],
    group: ['class_name'],
    order: [[literal('count'), 'DESC']],
    raw: true,
  }) as any[];

  const totalDefects = distribution.reduce((sum, item) => sum + parseInt(item.count, 10), 0);

  logger.info('[metrics.service.ts] getDefectDistributionService - Success');
  return distribution.map(item => {
    const count = parseInt(item.count, 10);
    return {
      type: item.type,
      count,
      percentage: totalDefects > 0 ? (count / totalDefects) * 100 : 0
    };
  });
}

export async function getModelUsageMetricsService(filters: GetMetricsFilters, logger: FastifyBaseLogger) {
  logger.info({ filters }, '[metrics.service.ts] getModelUsageMetricsService - Init');
  const where = buildInferenceWhere(filters);
  
  const usage = await Inference.findAll({
    where,
    attributes: [
      ['model_name', 'modelName'],
      [fn('COUNT', col('id')), 'totalInferences'],
      [fn('AVG', col('inference_time_ms')), 'avgInferenceTimeMs'],
      [fn('AVG', col('total_detections')), 'avgDetectionsPerInference']
    ],
    group: ['model_name'],
    order: [[literal('totalInferences'), 'DESC']],
    raw: true,
  }) as any[];

  const overallTotal = usage.reduce((sum, item) => sum + parseInt(item.totalInferences, 10), 0);

  logger.info('[metrics.service.ts] getModelUsageMetricsService - Success');
  return usage.map(item => {
    const totalInferences = parseInt(item.totalInferences, 10);
    return {
      modelName: item.modelName,
      totalInferences,
      percentage: overallTotal > 0 ? (totalInferences / overallTotal) * 100 : 0,
      avgInferenceTimeMs: parseFloat(item.avgInferenceTimeMs || '0'),
      avgDetectionsPerInference: parseFloat(item.avgDetectionsPerInference || '0')
    };
  });
}

export async function getConfidenceByDefectTypeService(filters: GetMetricsFilters, logger: FastifyBaseLogger) {
  logger.info({ filters }, '[metrics.service.ts] getConfidenceByDefectTypeService - Init');
  const where = buildInferenceWhere(filters);
  
  const confidenceData = await Detection.findAll({
    include: [{
      model: InferenceImage,
      as: 'inferenceImage',
      required: true,
      attributes: [],
      include: [{
        model: Inference,
        as: 'inference',
        where,
        required: true,
        attributes: []
      }]
    }],
    attributes: [
      ['class_name', 'type'],
      [fn('AVG', col('confidence')), 'avgConfidence'],
      [fn('MIN', col('confidence')), 'minConfidence'],
      [fn('MAX', col('confidence')), 'maxConfidence']
    ],
    group: ['class_name'],
    raw: true,
  }) as any[];

  logger.info('[metrics.service.ts] getConfidenceByDefectTypeService - Success');
  return confidenceData.map(item => ({
    type: item.type,
    avgConfidence: parseFloat(item.avgConfidence || '0'),
    minConfidence: parseFloat(item.minConfidence || '0'),
    maxConfidence: parseFloat(item.maxConfidence || '0')
  }));
}

export async function getReportMetricsService(filters: GetMetricsFilters, logger: FastifyBaseLogger) {
  logger.info({ filters }, '[metrics.service.ts] getReportMetricsService - Init');
  try {
    const reportsResponse = await getReportsService({ 
      limit: 10000, 
      page: 1, 
      sortOrder: 'desc',
      reportType: 'all',
      startDate: filters.startDate, 
      endDate: filters.endDate 
    }, logger);
    
    const reports = reportsResponse.data;
    const totalReports = reports.length;
    
    const countsByType: Record<string, number> = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      manual: 0
    };
    
    reports.forEach(r => {
      if (countsByType[r.reportType] !== undefined) {
        countsByType[r.reportType]++;
      } else {
        countsByType[r.reportType] = 1;
      }
    });
    
    logger.info('[metrics.service.ts] getReportMetricsService - Success');
    return {
      totalReports,
      byType: Object.entries(countsByType).map(([type, count]) => ({ type, count }))
    };
  } catch (error) {
    logger.error({ err: error }, '[metrics.service.ts] getReportMetricsService - Error fetching report metrics');
    return { totalReports: 0, byType: [] };
  }
}

export async function getAllMetricsService(filters: GetMetricsFilters, logger: FastifyBaseLogger) {
  logger.info({ filters }, '[metrics.service.ts] getAllMetricsService - Init');
  const [
    summary,
    timeSeries,
    defectDistribution,
    modelUsage,
    confidenceByDefectType,
    reports
  ] = await Promise.all([
    getSummaryMetricsService(filters, logger),
    getTimeSeriesMetricsService(filters, logger),
    getDefectDistributionService(filters, logger),
    getModelUsageMetricsService(filters, logger),
    getConfidenceByDefectTypeService(filters, logger),
    getReportMetricsService(filters, logger)
  ]);

  logger.info('[metrics.service.ts] getAllMetricsService - Success');
  return {
    summary,
    timeSeries,
    defectDistribution,
    modelUsage,
    confidenceByDefectType,
    reports
  };
}
