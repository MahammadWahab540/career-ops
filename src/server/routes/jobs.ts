/**
 * Job evaluation and management routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { evaluateJobSchema, listJobsQuerySchema, jobResponseSchema, paginatedResponseSchema } from '../schemas';
import { withTenantContext } from '../middleware/tenancy';
import { coJobsTotal } from '../../observability/metrics';
import { logAudit } from '../../observability/logger';

export async function jobsRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /v1/users/:uid/jobs/evaluate - evaluate a job posting
  fastify.post(
    '/v1/users/:uid/jobs/evaluate',
    {
      schema: {
        body: evaluateJobSchema,
      },
    },
    async (
      request: FastifyRequest<{ 
        Params: { uid: string }; 
        Body: { jdUrl?: string; jdText?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { uid: userId } = request.params;
      const { jdUrl, jdText } = request.body;

      return withTenantContext(request, async () => {
        // Generate deterministic job ID based on inputs
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // TODO: Queue evaluation job with BullMQ
        // const jobRun = await fastify.prisma.jobRun.create({
        //   data: {
        //     type: 'evaluate',
        //     userId,
        //     status: 'pending',
        //     payload: { jdUrl, jdText },
        //   },
        // });
        //
        // await fastify.evaluateQueue.add('evaluate', {
        //   jobRunId: jobRun.id,
        //   userId,
        //   jdUrl,
        //   jdText,
        // });

        coJobsTotal.inc({ type: 'evaluate', status: 'pending' });
        logAudit('job_evaluation_started', jobId, { jdUrl, hasJdText: !!jdText });

        // Return 202 Accepted for async processing
        return reply.code(202).send({
          jobId,
          status: 'pending',
          message: 'Evaluation queued',
        });
      });
    }
  );

  // POST /v1/users/:uid/jobs/scan - trigger job discovery scan
  fastify.post(
    '/v1/users/:uid/jobs/scan',
    {},
    async (
      request: FastifyRequest<{ Params: { uid: string } }>,
      reply: FastifyReply
    ) => {
      const { uid: userId } = request.params;

      return withTenantContext(request, async () => {
        const scanId = `scan_${Date.now()}`;

        // TODO: Queue scan job
        // const jobRun = await fastify.prisma.jobRun.create({
        //   data: {
        //     type: 'scan',
        //     userId,
        //     status: 'pending',
        //     payload: {},
        //   },
        // });

        coJobsTotal.inc({ type: 'scan', status: 'pending' });
        logAudit('job_scan_started', scanId);

        return reply.code(202).send({
          scanId,
          status: 'pending',
          message: 'Job scan queued',
        });
      });
    }
  );

  // GET /v1/users/:uid/jobs - list jobs with pagination
  fastify.get(
    '/v1/users/:uid/jobs',
    {
      schema: {
        querystring: listJobsQuerySchema,
      },
    },
    async (
      request: FastifyRequest<{ 
        Params: { uid: string }; 
        Querystring: { 
          status?: string; 
          page?: number; 
          limit?: number;
          sortBy?: string;
          sortOrder?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { uid: userId } = request.params;
      const { 
        status, 
        page = 1, 
        limit = 20, 
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = request.query;

      return withTenantContext(request, async () => {
        // TODO: Fetch from database with pagination
        // const [jobs, total] = await Promise.all([
        //   fastify.prisma.jobPosting.findMany({
        //     where: { userId, ...(status && { status }) },
        //     skip: (page - 1) * limit,
        //     take: limit,
        //     orderBy: { [sortBy]: sortOrder },
        //   }),
        //   fastify.prisma.jobPosting.count({
        //     where: { userId, ...(status && { status }) },
        //   }),
        // ]);

        // Placeholder response
        const jobs = [];
        const total = 0;

        return reply.send({
          data: jobs,
          meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      });
    }
  );

  // GET /v1/jobs/:run_id - get async job status
  fastify.get(
    '/v1/jobs/:runId',
    {},
    async (
      request: FastifyRequest<{ Params: { runId: string } }>,
      reply: FastifyReply
    ) => {
      const { runId } = request.params;

      // TODO: Fetch job run status
      // const jobRun = await fastify.prisma.jobRun.findUnique({
      //   where: { id: runId },
      // });

      return reply.send({
        id: runId,
        type: 'evaluate',
        status: 'completed',
        error: null,
        startedAt: new Date(),
        finishedAt: new Date(),
        createdAt: new Date(),
      });
    }
  );
}
