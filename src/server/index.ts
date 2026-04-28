/**
 * Fastify server bootstrap and configuration
 */

import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerRoutes } from './routes';
import { authMiddleware, tenancyMiddleware, idempotencyMiddleware, errorHandler } from './middleware';
import { logger as baseLogger } from '../observability/logger';
import { cleanupStaleWorkspaces } from '../tenancy/workspace';

export interface ServerOptions {
  port?: number;
  host?: string;
  logLevel?: string;
}

export async function buildServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const {
    port = parseInt(process.env.PORT || '3000', 10),
    host = process.env.HOST || '0.0.0.0',
    logLevel = process.env.LOG_LEVEL || 'info',
  } = options;

  // Create Fastify instance with custom logger
  const fastify = Fastify({
    logger: {
      level: logLevel,
      formatters: {
        level: (label) => ({ level: label }),
      },
    },
  });

  // Register error handler
  fastify.setErrorHandler(errorHandler);

  // Register plugins
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Co-Signature', 'X-Tenant-Id', 'Idempotency-Key'],
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable for API service
  });

  // Global middleware for all routes
  // Note: Auth is applied selectively in route registration
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip middleware for health endpoints
    if (request.url.startsWith('/healthz') || 
        request.url.startsWith('/readyz') || 
        request.url.startsWith('/metrics')) {
      return;
    }

    // Apply tenancy middleware to extract context
    await tenancyMiddleware(request, reply);
    
    // Apply idempotency middleware
    await idempotencyMiddleware(request, reply);
    
    // Apply auth middleware
    await authMiddleware(request, reply);
  });

  // Register routes
  await registerRoutes(fastify);

  // Graceful shutdown handlers
  const closeListeners = () => {
    fastify.log.info('Shutting down server...');
    
    // Clean up stale workspaces before exit
    cleanupStaleWorkspaces(0).then(() => {
      fastify.log.info('Workspace cleanup complete');
    });
  };

  process.on('SIGTERM', () => {
    closeListeners();
    fastify.close();
  });

  process.on('SIGINT', () => {
    closeListeners();
    fastify.close();
  });

  // Boot-time workspace cleanup
  fastify.addHook('onReady', async () => {
    fastify.log.info('Cleaning up stale workspaces from previous runs...');
    await cleanupStaleWorkspaces(0); // Clean all on boot
    fastify.log.info('Startup cleanup complete');
  });

  return fastify;
}

export async function startServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const fastify = await buildServer(options);

  try {
    await fastify.listen({
      port: options.port || parseInt(process.env.PORT || '3000', 10),
      host: options.host || process.env.HOST || '0.0.0.0',
    });

    const addr = fastify.server.address();
    const port = typeof addr === 'object' && addr ? addr.port : options.port;
    
    fastify.log.info(`Server listening on http://${options.host || '0.0.0.0'}:${port}`);
    
    return fastify;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
