import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getReportsService, sendReportEmailService } from '../services/reports.service.js';
import { generateReportService } from '../services/reports-generate.service.js';
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

export const GenerateReportSchema = z.object({
  reportName: z.string().min(1).max(200).describe('Nome do relatório definido pelo usuário'),
  selectedIds: z.array(z.number().int().positive()).optional(),
  excludedIds: z.array(z.number().int().positive()).optional(),
  filters: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    modelName: z.string().optional(),
    defectType: z.string().optional(),
  }).optional(),
}).refine(
  (data) => (data.selectedIds && data.selectedIds.length > 0) || data.filters,
  { message: 'Forneça selectedIds ou filters.' }
).refine(
  (data) => !(data.selectedIds && data.excludedIds),
  { message: 'Não é possível usar selectedIds e excludedIds simultaneamente.' }
);

export type GenerateReportBody = z.infer<typeof GenerateReportSchema>;

export const SendReportParamsSchema = z.object({
  filename: z.string().min(1).describe('Nome do arquivo de metadados do relatório (ex: 2026-08-01-report.json)'),
});

export const SendReportBodySchema = z.object({
  language: z.enum(['pt-BR', 'en']).default('pt-BR').describe('Idioma do conteúdo do e-mail'),
  recipients: z.array(z.string().email()).min(1).max(50).describe('Lista de e-mails para envio'),
});

export type SendReportParams = z.infer<typeof SendReportParamsSchema>;
export type SendReportBody = z.infer<typeof SendReportBodySchema>;

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

  app.post('/generate', {
    schema: {
      tags: ['Reports'],
      summary: 'Generate manual report',
      description: 'Requests generation of a manual report by selecting specific inferences or filters',
      body: GenerateReportSchema,
    },
    handler: generateReportHandler,
  });

  app.post('/:filename/send', {
    schema: {
      tags: ['Reports'],
      summary: 'Send report via email',
      description: 'Sends a specific report to verified recipients in the chosen language',
      params: SendReportParamsSchema,
      body: SendReportBodySchema,
    },
    handler: sendReportHandler,
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

/**
 * Handles the generation of manual reports.
 * 
 * Architecture Flow:
 * 1. HTTP request received with specific inference IDs or filters.
 * 2. Backend queries the DB to resolve all matching inferences.
 * 3. Backend sends an SQS message containing the inference references.
 * 4. A separate AWS Lambda consumer polls the SQS queue, generates a PPTX report,
 *    and uploads the final file to S3.
 */
async function generateReportHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = request.body as GenerateReportBody;
  request.log.info({ body }, '[reports.controller.ts] generateReportHandler - Init');

  try {
    const result = await generateReportService(body, request.log);
    request.log.info('[reports.controller.ts] generateReportHandler - Success');
    reply.status(201).send(result);
  } catch (error: any) {
    request.log.error({ error }, '[reports.controller.ts] generateReportHandler - Error');
    
    if (error === API_ERRORS.NO_INFERENCES_FOUND) {
      reply.status(API_ERRORS.NO_INFERENCES_FOUND.statusCode).send(API_ERRORS.NO_INFERENCES_FOUND);
      return;
    }
    
    if (error === API_ERRORS.INVALID_REPORT_REQUEST) {
      reply.status(API_ERRORS.INVALID_REPORT_REQUEST.statusCode).send(API_ERRORS.INVALID_REPORT_REQUEST);
      return;
    }

    reply.status(API_ERRORS.GENERATE_REPORT_FAILED.statusCode).send(API_ERRORS.GENERATE_REPORT_FAILED);
  }
}

async function sendReportHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { filename } = request.params as SendReportParams;
  const { language, recipients } = request.body as SendReportBody;
  request.log.info({ filename, language, recipients }, '[reports.controller.ts] sendReportHandler - Init');

  try {
    const result = await sendReportEmailService(filename, language, recipients, request.log);
    request.log.info('[reports.controller.ts] sendReportHandler - Success');
    reply.status(200).send(result);
  } catch (error: any) {
    request.log.error({ error }, '[reports.controller.ts] sendReportHandler - Error');

    if (error === API_ERRORS.REPORT_NOT_FOUND) {
      reply.status(API_ERRORS.REPORT_NOT_FOUND.statusCode).send(API_ERRORS.REPORT_NOT_FOUND);
      return;
    }

    if (error === API_ERRORS.NO_VERIFIED_RECIPIENTS) {
      reply.status(API_ERRORS.NO_VERIFIED_RECIPIENTS.statusCode).send(API_ERRORS.NO_VERIFIED_RECIPIENTS);
      return;
    }

    reply.status(API_ERRORS.SEND_EMAIL_FAILED.statusCode).send(API_ERRORS.SEND_EMAIL_FAILED);
  }
}

