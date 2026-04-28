/**
 * AsyncLocalStorage-based request context for multi-tenancy
 * Provides tenantId, userId, and runId throughout the request lifecycle
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  tenantId: string;
  userId: string;
  runId?: string;
}

export const ctx = new AsyncLocalStorage<RequestContext>();

/**
 * Execute a function with the given request context
 */
export function withContext<T>(context: RequestContext, fn: () => T): T {
  return ctx.run(context, fn);
}

/**
 * Get the current request context
 * Returns undefined if not in a request context
 */
export function getContext(): RequestContext | undefined {
  return ctx.getStore();
}

/**
 * Get the current tenant ID from context
 * Throws if not in a request context
 */
export function getTenantId(): string {
  const context = getContext();
  if (!context) {
    throw new Error('No request context available');
  }
  return context.tenantId;
}

/**
 * Get the current user ID from context
 * Throws if not in a request context
 */
export function getUserId(): string {
  const context = getContext();
  if (!context) {
    throw new Error('No request context available');
  }
  return context.userId;
}

/**
 * Get the current run ID from context
 * Returns undefined if not set
 */
export function getRunId(): string | undefined {
  const context = getContext();
  return context?.runId;
}
