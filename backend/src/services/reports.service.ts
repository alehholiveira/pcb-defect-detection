import type { FastifyBaseLogger } from 'fastify';
import { listReportMetadataKeys, getJsonFromS3 } from '../aws/s3.helper.js';
import type { GetReportsFilters } from '../controllers/reports.controller.js';

export interface ReportMetadata {
  reportName: string;
  filename: string;
  downloadUrl: string;
  generatedAt: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  totalInferences: number;
  totalImages: number;
  totalDefects: number;
  defectsByType: Record<string, number>;
  generatedBy: string;
}

export async function getReportsService(filters: GetReportsFilters, logger: FastifyBaseLogger) {
  logger.info({ filters }, '[reports.service.ts] getReportsService - Init');

  const {
    reportType,
    startDate,
    endDate,
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = filters;

  // 1. List all metadata JSON keys
  const keys = await listReportMetadataKeys();

  // 2. Download all metadata JSONs in parallel
  const reportsPromise = keys.map((key) => getJsonFromS3<ReportMetadata>(key));
  let reports = await Promise.all(reportsPromise);

  // 3. Apply filters
  if (reportType && reportType !== 'all') {
    if (reportType === 'automatic') {
      reports = reports.filter(r => ['daily', 'weekly', 'monthly'].includes(r.reportType));
    } else {
      reports = reports.filter(r => r.reportType === reportType);
    }
  }

  if (startDate) {
    const startObj = new Date(startDate);
    reports = reports.filter(r => new Date(r.generatedAt) >= startObj);
  }

  if (endDate) {
    const endObj = new Date(endDate);
    reports = reports.filter(r => new Date(r.generatedAt) <= endObj);
  }

  // 4. Sort reports
  reports.sort((a, b) => {
    const dateA = new Date(a.generatedAt).getTime();
    const dateB = new Date(b.generatedAt).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // 5. Pagination
  const total = reports.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedReports = reports.slice(offset, offset + limit);

  logger.info({ total, page, totalPages }, '[reports.service.ts] getReportsService - Success');

  return {
    data: paginatedReports,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}
