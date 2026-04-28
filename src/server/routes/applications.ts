/**
 * Application management routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  createApplicationSchema, 
  submitApplicationSchema, 
  refreshApplicationSchema,
  applicationResponseSchema 
} from '../schemas';
import { withTenantContext } from '../middleware/tenancy';
import { coSubmitTotal } from '../../observability/metrics';
import { logAudit } from '../../observability/logger';

export async function applicationsRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /v1/applications - create application from job posting + render CV
  fastify.post(
    '/v1/applications',
    {
      schema: {
        body: createApplicationSchema,
      },
    },
    async (
      request: FastifyRequest<{ Body: { jobPostingId: string; submitTier?: number } }>,
      reply: FastifyReply
    ) => {
      const { jobPostingId, submitTier } = request.body;

      return withTenantContext(request, async () => {
        const applicationId = `app_${Date.now()}`;

        // TODO: Create application and render CV
        // const application = await fastify.prisma.jobApplication.create({
        //   data: {
        //     userId: request.tenantContext!.userId!,
        //     jobPostingId,
        //     status: 'draft',
        //     submitTier,
        //   },
        // });
        //
        // // Queue CV render if needed
        // await fastify.cvRenderQueue.add('render', {
        //   applicationId: application.id,
        // });

        logAudit('application_created', applicationId, { jobPostingId, submitTier });

        return reply.code(201).send({
          id: applicationId,
          jobPostingId,
          status: 'draft',
          submitTier: submitTier || null,
          submittedAt: null,
          lastStatusCheckAt: null,
          events: [],
        });
      });
    }
  );

  // POST /v1/applications/:id/submit - submit application (tier 1/2/3 dispatch)
  fastify.post(
    '/v1/applications/:id/submit',
    {
      schema: {
        body: submitApplicationSchema,
      },
    },
    async (
      request: FastifyRequest<{ 
        Params: { id: string }; 
        Body: { tier?: number };
      }>,
      reply: FastifyReply
    ) => {
      const { id: applicationId } = request.params;
      const { tier } = request.body;

      return withTenantContext(request, async () => {
        // TODO: Queue submission job
        // const application = await fastify.prisma.jobApplication.findUnique({
        //   where: { id: applicationId },
        //   include: { jobPosting: true },
        // });
        //
        // if (!application) {
        //   throw reply.code(404).send({ error: 'Application not found' });
        // }
        //
        // const submitTier = tier || application.submitTier || 1;
        //
        // await fastify.submitQueue.add('submit', {
        //   applicationId,
        //   tier: submitTier,
        // });

        coSubmitTotal.inc({ portal: 'unknown', tier: String(tier || 1), status: 'queued' });
        logAudit('application_submit_queued', applicationId, { tier });

        return reply.code(202).send({
          applicationId,
          status: 'submitting',
          message: 'Submission queued',
        });
      });
    }
  );

  // GET /v1/applications/:id - get application status + events
  fastify.get(
    '/v1/applications/:id',
    {},
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id: applicationId } = request.params;

      return withTenantContext(request, async () => {
        // TODO: Fetch application with events
        // const application = await fastify.prisma.jobApplication.findUnique({
        //   where: { id: applicationId },
        //   include: {
        //     applicationEvents: {
        //       orderBy: { occurredAt: 'desc' },
        //       take: 50,
        //     },
        //   },
        // });

        return reply.send({
          id: applicationId,
          jobPostingId: 'job_placeholder',
          status: 'draft',
          submitTier: null,
          submittedAt: null,
          lastStatusCheckAt: null,
          events: [],
        });
      });
    }
  );

  // POST /v1/applications/:id/refresh - re-poll portal for status updates
  fastify.post(
    '/v1/applications/:id/refresh',
    {
      schema: {
        body: refreshApplicationSchema,
      },
    },
    async (
      request: FastifyRequest<{ 
        Params: { id: string }; 
        Body: { force?: boolean };
      }>,
      reply: FastifyReply
    ) => {
      const { id: applicationId } = request.params;
      const { force = false } = request.body;

      return withTenantContext(request, async () => {
        // TODO: Queue status check job
        // await fastify.statusCheckQueue.add('check', {
        //   applicationId,
        //   force,
        // });

        logAudit('application_refresh_requested', applicationId, { force });

        return reply.code(202).send({
          applicationId,
          status: 'refreshing',
          message: 'Status check queued',
        });
      });
    }
  );
}
