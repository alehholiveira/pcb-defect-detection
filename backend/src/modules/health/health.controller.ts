import type { FastifyRequest, FastifyReply } from 'fastify';
import { getHealthStatus } from './health.service.js';

export async function healthCheck(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const health = await getHealthStatus();

  const statusCode = health.status === 'healthy' ? 200 : 503;
  reply.status(statusCode).send(health);
}
