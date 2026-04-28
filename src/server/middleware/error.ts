/**
 * Error handling middleware
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../../observability/logger';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log the error with full context
  logger.error(
    {
      err: error,
      method: request.method,
      url: request.url,
      tenantId: request.tenantContext?.tenantId,
      userId: request.tenantContext?.userId,
    },
    'Request error'
  );

  // Handle specific error types
  if (error.name === 'ZodError') {
    return reply.code(400).send({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.message,
    });
  }

  if (error.name === 'UnauthorizedError' || error.message.includes('signature')) {
    return reply.code(401).send({
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
    });
  }

  if (error.name === 'NotFoundError' || error.message.includes('not found')) {
    return reply.code(404).send({
      error: 'Resource not found',
      code: 'NOT_FOUND',
    });
  }

  // Default error response
  const statusCode = (error as unknown as { statusCode?: number }).statusCode || 500;
  
  reply.code(statusCode).send({
    error: statusCode === 500 ? 'Internal server error' : error.message,
    code: statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
}
