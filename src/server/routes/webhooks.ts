/**
 * Webhook routes for inbound portal events
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { portalWebhookSchema } from '../schemas';
import { logAudit } from '../../observability/logger';

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /v1/webhooks/portal/:portal - inbound webhook from Greenhouse, Lever, etc.
  fastify.post(
    '/v1/webhooks/portal/:portal',
    {
      schema: {
        body: portalWebhookSchema,
      },
    },
    async (
      request: FastifyRequest<{ 
        Params: { portal: string }; 
        Body: { 
          event: string; 
          applicationId: string; 
          status?: string;
          payload: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { portal } = request.params;
      const { event, applicationId, status, payload } = request.body;

      // TODO: Verify webhook signature based on portal type
      // TODO: Process webhook and update application status
      // await fastify.prisma.applicationEvent.create({
      //   data: {
      //     applicationId,
      //     event,
      //     payload,
      //     source: `webhook:${portal}`,
      //   },
      // });
      //
      // if (status) {
      //   await fastify.prisma.jobApplication.update({
      //     where: { id: applicationId },
      //     data: {
      //       status,
      //       lastStatusCheckAt: new Date(),
      //     },
      //   });
      // }

      logAudit('webhook_received', applicationId, { portal, event, status });

      return reply.code(200).send({
        received: true,
        applicationId,
        event,
      });
    }
  );
}
