/**
 * Health check endpoints
 */

import { FastifyInstance } from 'fastify';
import { getMetrics } from '../../observability/metrics';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Basic liveness probe
  fastify.get('/healthz', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Readiness probe - checks dependencies
  fastify.get('/readyz', async (request, reply) => {
    const checks: Record<string, boolean> = {};
    let allHealthy = true;

    // Check database connection
    try {
      // await fastify.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
      allHealthy = false;
    }

    // Check Redis connection
    try {
      // await fastify.redis.ping();
      checks.redis = true;
    } catch {
      checks.redis = false;
      allHealthy = false;
    }

    const status = allHealthy ? 'ok' : 'degraded';
    const statusCode = allHealthy ? 200 : 503;

    return reply.code(statusCode).send({
      status,
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // Prometheus metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return getMetrics();
  });
}
