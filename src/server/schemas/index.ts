/**
 * Zod schemas for HTTP request/response validation
 */

import { z } from 'zod';

// Common schemas
export const idempotencyKeySchema = z.string().max(128).optional();

// User management
export const createUserSchema = z.object({
  luminaUserId: z.string().min(1),
  status: z.enum(['active', 'suspended', 'deleted']).optional().default('active'),
});

export const updateUserProfileSchema = z.object({
  cvMarkdown: z.string().min(1),
  profile: z.record(z.unknown()),
  targetRoles: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
});

// Job evaluation
export const evaluateJobSchema = z.object({
  jdUrl: z.string().url().optional(),
  jdText: z.string().min(1).optional(),
}).refine((data) => data.jdUrl || data.jdText, {
  message: 'Either jdUrl or jdText must be provided',
});

// Job scanning
export const scanJobsSchema = z.object({
  sources: z.array(z.enum(['linkedin', 'indeed', 'glassdoor', 'company_sites'])).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

// Job listing query
export const listJobsQuerySchema = z.object({
  status: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['createdAt', 'title', 'company']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Application creation
export const createApplicationSchema = z.object({
  jobPostingId: z.string().min(1),
  submitTier: z.number().int().min(1).max(3).optional(),
});

// Application submission
export const submitApplicationSchema = z.object({
  tier: z.number().int().min(1).max(3).optional(),
});

// Application refresh
export const refreshApplicationSchema = z.object({
  force: z.boolean().optional().default(false),
});

// Webhook payload (portal inbound)
export const portalWebhookSchema = z.object({
  event: z.string(),
  applicationId: z.string(),
  status: z.string().optional(),
  payload: z.record(z.unknown()),
});

// Response schemas
export const jobResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  url: z.string().nullable(),
  source: z.string(),
  status: z.string(),
  createdAt: z.date(),
});

export const applicationResponseSchema = z.object({
  id: z.string(),
  jobPostingId: z.string(),
  status: z.string(),
  submitTier: z.number().nullable(),
  submittedAt: z.date().nullable(),
  lastStatusCheckAt: z.date().nullable(),
  events: z.array(z.object({
    event: z.string(),
    payload: z.record(z.unknown()),
    occurredAt: z.date(),
    source: z.string(),
  })),
});

export const jobRunResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  error: z.string().nullable(),
  startedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),
  createdAt: z.date(),
});

// Pagination
export const paginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });

// Error response
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
