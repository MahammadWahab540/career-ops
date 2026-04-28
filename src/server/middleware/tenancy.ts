/**
 * Tenancy middleware - extracts and validates tenant context from request
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { withContext } from '../../tenancy/context';

export interface TenantContext {
  tenantId: string;
  userId?: string;
}

// Extend FastifyRequest type to include tenant context
declare module 'fastify' {
  interface FastifyRequest {
    tenantContext?: TenantContext;
  }
}

/**
 * Extract tenant ID from URL parameter or header
 */
export async function tenancyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Try to get tenantId from URL params first
  const tenantIdFromParams = (request.params as Record<string, string>)?.tid;
  
  // Fall back to header
  const tenantIdFromHeader = request.headers['x-tenant-id'];
  
  const tenantId = tenantIdFromParams || tenantIdFromHeader;
  
  if (!tenantId) {
    throw reply.code(400).send({
      error: 'Missing tenant ID',
      code: 'MISSING_TENANT_ID',
    });
  }

  // Try to get userId from URL params
  const userId = (request.params as Record<string, string>)?.uid;

  request.tenantContext = { tenantId, userId };

  // Wrap the rest of the request handling in context
  // This is done in the route handler via withContext
}

/**
 * Wrap a handler function with tenant context
 */
export function withTenantContext<T>(
  request: FastifyRequest,
  fn: () => Promise<T>
): Promise<T> {
  const ctx = request.tenantContext;
  
  if (!ctx) {
    throw new Error('Tenant context not set - ensure tenancyMiddleware runs first');
  }

  return withContext(
    {
      tenantId: ctx.tenantId,
      userId: ctx.userId || 'system',
    },
    fn
  );
}
