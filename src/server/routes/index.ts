/**
 * Server routes index and registration
 */

import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { userRoutes } from './users';
import { jobsRoutes } from './jobs';
import { applicationsRoutes } from './applications';
import { webhookRoutes } from './webhooks';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Health and metrics endpoints (no auth required)
  await fastify.register(healthRoutes);

  // API routes (auth required - added in server/index.ts)
  await fastify.register(userRoutes);
  await fastify.register(jobsRoutes);
  await fastify.register(applicationsRoutes);
  await fastify.register(webhookRoutes);
}
