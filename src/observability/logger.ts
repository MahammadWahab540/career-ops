/**
 * Request-scoped logger using pino
 * Automatically includes tenantId, userId, and runId from context
 */

import pino, { Logger, LoggerOptions } from 'pino';
import { getContext } from '../tenancy/context';

const baseOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
};

export const logger: Logger = pino(baseOptions);

/**
 * Create a child logger with request context
 */
export function createRequestLogger(): Logger {
  const context = getContext();
  
  if (!context) {
    return logger;
  }
  
  return logger.child({
    tenantId: context.tenantId,
    userId: context.userId,
    runId: context.runId,
  });
}

/**
 * Log an audit event
 */
export function logAudit(
  action: string,
  target?: string,
  metadata?: Record<string, unknown>
): void {
  const context = getContext();
  
  logger.info(
    {
      ...metadata,
      actor: context?.userId || 'system',
      action,
      target,
      audit: true,
    },
    'audit_log'
  );
}
