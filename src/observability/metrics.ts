/**
 * Prometheus metrics for career-ops service
 */

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// Job counters
export const coJobsTotal = new Counter({
  name: 'co_jobs_total',
  help: 'Total number of jobs processed',
  labelNames: ['type', 'status'] as const,
  registers: [register],
});

// AI token usage
export const coAiTokensTotal = new Counter({
  name: 'co_ai_tokens_total',
  help: 'Total AI tokens consumed',
  labelNames: ['model', 'tenantId'] as const,
  registers: [register],
});

// Workspace bytes
export const coWorkspaceBytes = new Gauge({
  name: 'co_workspace_bytes',
  help: 'Current workspace disk usage in bytes',
  labelNames: ['tenantId'] as const,
  registers: [register],
});

// Submit operations
export const coSubmitTotal = new Counter({
  name: 'co_submit_total',
  help: 'Total submission attempts',
  labelNames: ['portal', 'tier', 'status'] as const,
  registers: [register],
});

// Request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'co_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// Queue job duration
export const queueJobDuration = new Histogram({
  name: 'co_queue_job_duration_seconds',
  help: 'Queue job processing duration in seconds',
  labelNames: ['queue', 'status'] as const,
  buckets: [1, 5, 10, 30, 60, 300],
  registers: [register],
});

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.clear();
}
