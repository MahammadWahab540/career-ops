/**
 * Idempotency middleware - ensures duplicate requests return cached responses
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';

// In-memory cache for idempotency keys (should use Redis in production)
const idempotencyCache = new Map<
  string,
  { response: unknown; timestamp: number }
>();

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function idempotencyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const idempotencyKey = request.headers['idempotency-key'];

  if (!idempotencyKey) {
    return; // No idempotency key, proceed normally
  }

  const keyString = typeof idempotencyKey === 'string' 
    ? idempotencyKey 
    : idempotencyKey[0];

  if (!keyString) {
    return;
  }

  // Create a unique cache key including the request path and method
  const cacheKey = createHash('sha256')
    .update(`${request.method}:${request.url}:${keyString}`)
    .digest('hex');

  const cached = idempotencyCache.get(cacheKey);

  if (cached) {
    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp < IDEMPOTENCY_TTL_MS) {
      request.log.debug({ cacheKey }, 'Returning cached idempotent response');
      return reply.send(cached.response);
    } else {
      // Cache expired, remove it
      idempotencyCache.delete(cacheKey);
    }
  }

  // Store original send function
  const originalSend = reply.send;

  // Override send to cache the response
  reply.send = function (payload: unknown) {
    // Only cache successful responses (2xx status codes)
    if (reply.statusCode >= 200 && reply.statusCode < 300) {
      idempotencyCache.set(cacheKey, {
        response: payload,
        timestamp: Date.now(),
      });
    }
    return originalSend.call(this, payload);
  };
}

/**
 * Clean up expired idempotency cache entries
 * Should be called periodically
 */
export function cleanupIdempotencyCache(): void {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyCache.delete(key);
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupIdempotencyCache, 60 * 60 * 1000);
}
