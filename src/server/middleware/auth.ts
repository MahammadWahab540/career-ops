/**
 * HMAC signature authentication middleware
 * Verifies x-co-signature header against request body
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';

const SHARED_SECRET = process.env.CO_SHARED_SECRET;

if (!SHARED_SECRET && process.env.NODE_ENV !== 'test') {
  console.warn('CO_SHARED_SECRET not set - auth middleware will skip validation in dev mode');
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip auth in test/dev mode if no secret is configured
  if (!SHARED_SECRET && process.env.NODE_ENV !== 'production') {
    request.log.warn('Skipping auth validation - no CO_SHARED_SECRET configured');
    return;
  }

  const signature = request.headers['x-co-signature'];
  
  if (!signature) {
    throw reply.code(401).send({
      error: 'Missing signature',
      code: 'MISSING_SIGNATURE',
    });
  }

  const body = JSON.stringify(request.body);
  const expectedSignature = `sha256=${createHmac('sha256', SHARED_SECRET!)
    .update(body)
    .digest('hex')}`;

  // Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw reply.code(401).send({
      error: 'Invalid signature',
      code: 'INVALID_SIGNATURE',
    });
  }

  request.log.debug('Auth signature validated successfully');
}

/**
 * Generate HMAC signature for outbound requests
 */
export function generateSignature(body: unknown, secret: string): string {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return `sha256=${createHmac('sha256', secret)
    .update(bodyStr)
    .digest('hex')}`;
}
