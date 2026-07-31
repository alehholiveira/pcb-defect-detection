import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { FastifyTypedInstance } from '../schemas/common.js';
import { listRecipientEmailsService, addRecipientEmailService, removeRecipientEmailService } from '../services/settings-emails.service.js';
import { getSchedulesService, updateSchedulesService } from '../services/settings-schedules.service.js';
import { API_ERRORS } from '../utils/errors.js';

export const AddEmailBodySchema = z.object({ 
  email: z.string().email().describe('Endereço de e-mail do destinatário'),
});
type AddEmailBody = z.infer<typeof AddEmailBodySchema>;

export const EmailIdParamSchema = z.object({ 
  id: z.coerce.number().int().positive().describe('ID do e-mail destinatário'),
});
type EmailIdParam = z.infer<typeof EmailIdParamSchema>;

export const UpdateSchedulesBodySchema = z.object({
  daily: z.boolean().describe('Ativar ou desativar relatório diário'),
  weekly: z.boolean().describe('Ativar ou desativar relatório semanal'),
  monthly: z.boolean().describe('Ativar ou desativar relatório mensal'),
});
type UpdateSchedulesBody = z.infer<typeof UpdateSchedulesBodySchema>;

export async function settingsController(app: FastifyTypedInstance): Promise<void> {
  // E-mails
  app.get('/emails', {
    schema: {
      tags: ['Settings'],
      summary: 'Get recipient emails',
      description: 'Fetch all registered recipient emails with their verification status',
    },
    handler: getRecipientEmailsHandler,
  });

  app.post('/emails', {
    schema: {
      tags: ['Settings'],
      summary: 'Add recipient email',
      description: 'Add a new recipient email and trigger SES verification',
      body: AddEmailBodySchema,
    },
    handler: addRecipientEmailHandler,
  });

  app.delete('/emails/:id', {
    schema: {
      tags: ['Settings'],
      summary: 'Delete recipient email',
      description: 'Remove a recipient email and delete its identity in SES',
      params: EmailIdParamSchema,
    },
    handler: deleteRecipientEmailHandler,
  });

  // Schedules
  app.get('/schedules', {
    schema: {
      tags: ['Settings'],
      summary: 'Get schedules',
      description: 'Fetch the status of automated report schedules',
    },
    handler: getSchedulesHandler,
  });

  app.put('/schedules', {
    schema: {
      tags: ['Settings'],
      summary: 'Update schedules',
      description: 'Update the status of automated report schedules',
      body: UpdateSchedulesBodySchema,
    },
    handler: updateSchedulesHandler,
  });
}

async function getRecipientEmailsHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  request.log.info('[settings.controller.ts] getRecipientEmailsHandler - Init');
  try {
    const data = await listRecipientEmailsService(request.log);
    request.log.info('[settings.controller.ts] getRecipientEmailsHandler - Success');
    return reply.status(200).send(data);
  } catch (error) {
    request.log.error({ error }, '[settings.controller.ts] getRecipientEmailsHandler - Error');
    return reply.status(500).send(API_ERRORS.INTERNAL_SERVER_ERROR);
  }
}

async function addRecipientEmailHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { email } = request.body as AddEmailBody;
  request.log.info({ email }, '[settings.controller.ts] addRecipientEmailHandler - Init');
  try {
    const data = await addRecipientEmailService(email, request.log);
    request.log.info('[settings.controller.ts] addRecipientEmailHandler - Success');
    return reply.status(201).send(data);
  } catch (error: any) {
    request.log.error({ error }, '[settings.controller.ts] addRecipientEmailHandler - Error');
    if (error.statusCode) {
      return reply.status(error.statusCode).send(error);
    }
    return reply.status(500).send(API_ERRORS.INTERNAL_SERVER_ERROR);
  }
}

async function deleteRecipientEmailHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { id } = request.params as EmailIdParam;
  request.log.info({ id }, '[settings.controller.ts] deleteRecipientEmailHandler - Init');
  try {
    const data = await removeRecipientEmailService(id, request.log);
    request.log.info('[settings.controller.ts] deleteRecipientEmailHandler - Success');
    return reply.status(200).send(data);
  } catch (error: any) {
    request.log.error({ error }, '[settings.controller.ts] deleteRecipientEmailHandler - Error');
    if (error.statusCode) {
      return reply.status(error.statusCode).send(error);
    }
    return reply.status(500).send(API_ERRORS.INTERNAL_SERVER_ERROR);
  }
}

async function getSchedulesHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  request.log.info('[settings.controller.ts] getSchedulesHandler - Init');
  try {
    const data = await getSchedulesService(request.log);
    request.log.info('[settings.controller.ts] getSchedulesHandler - Success');
    return reply.status(200).send(data);
  } catch (error) {
    request.log.error({ error }, '[settings.controller.ts] getSchedulesHandler - Error');
    return reply.status(500).send(API_ERRORS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Updates the automated report schedules.
 * 
 * This handler performs a two-step synchronization:
 * 1. Updates the schedule settings in the database.
 * 2. Dynamically enables or disables the corresponding AWS EventBridge rules
 *    to align the cloud infrastructure with the new database state.
 */
async function updateSchedulesHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = request.body as UpdateSchedulesBody;
  request.log.info({ body }, '[settings.controller.ts] updateSchedulesHandler - Init');
  try {
    const data = await updateSchedulesService(body, request.log);
    request.log.info('[settings.controller.ts] updateSchedulesHandler - Success');
    return reply.status(200).send(data);
  } catch (error) {
    request.log.error({ error }, '[settings.controller.ts] updateSchedulesHandler - Error');
    return reply.status(500).send(API_ERRORS.INTERNAL_SERVER_ERROR);
  }
}
