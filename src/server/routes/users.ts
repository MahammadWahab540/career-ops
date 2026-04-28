/**
 * User management routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createUserSchema, updateUserProfileSchema } from '../schemas';
import { withTenantContext } from '../middleware/tenancy';
import { withWorkspace } from '../../tenancy/workspace';
import { logAudit } from '../../observability/logger';

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /v1/tenants/:tid/users - provision user
  fastify.post(
    '/v1/tenants/:tid/users',
    {
      schema: {
        body: createUserSchema,
      },
    },
    async (request: FastifyRequest<{ Params: { tid: string }; Body: { luminaUserId: string; status?: string } }>, reply: FastifyReply) => {
      const { tid: tenantId } = request.params;
      const { luminaUserId, status = 'active' } = request.body;

      // TODO: Implement with Prisma
      // const user = await fastify.prisma.user.create({
      //   data: { tenantId, luminaUserId, status },
      // });

      logAudit('user_created', luminaUserId, { tenantId });

      return reply.code(201).send({
        id: 'user_' + Date.now(), // placeholder
        tenantId,
        luminaUserId,
        status,
        createdAt: new Date(),
      });
    }
  );

  // PUT /v1/users/:uid/profile - update career profile
  fastify.put(
    '/v1/users/:uid/profile',
    {
      schema: {
        body: updateUserProfileSchema,
      },
    },
    async (
      request: FastifyRequest<{ 
        Params: { uid: string }; 
        Body: { 
          cvMarkdown: string; 
          profile: Record<string, unknown>;
          targetRoles?: string[];
          locations?: string[];
          salaryMin?: number;
          salaryMax?: number;
          currency?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { uid: userId } = request.params;
      const profileData = request.body;

      return withTenantContext(request, async () => {
        // Materialize workspace with profile data
        await withWorkspace(userId, async (ws) => {
          await ws.write('cv.md', profileData.cvMarkdown);
          await ws.writeYaml('config/profile.yml', profileData.profile);
          
          // TODO: Persist to database
          // await fastify.prisma.careerProfile.upsert({
          //   where: { userId },
          //   create: { userId, ...profileData },
          //   update: profileData,
          // });
        });

        logAudit('profile_updated', userId);

        return {
          userId,
          updatedAt: new Date(),
        };
      });
    }
  );

  // GET /v1/users/:uid/profile - get career profile
  fastify.get(
    '/v1/users/:uid/profile',
    {},
    async (
      request: FastifyRequest<{ Params: { uid: string } }>,
      reply: FastifyReply
    ) => {
      const { uid: userId } = request.params;

      // TODO: Fetch from database
      // const profile = await fastify.prisma.careerProfile.findUnique({
      //   where: { userId },
      // });

      return reply.send({
        userId,
        cvMarkdown: '# Placeholder CV',
        profile: {},
        targetRoles: [],
        locations: [],
        currency: 'USD',
        updatedAt: new Date(),
      });
    }
  );
}
