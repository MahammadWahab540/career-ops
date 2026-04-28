/**
 * Batch processing service - replaces batch-runner.sh
 */

import { Queue, Worker, Job } from 'bullmq';
import { join } from 'path';
import { evaluateJob, type EvaluationResult } from './evaluation';
import { renderCvForUser, type CvRenderResult } from './cvRender';
import { scanJobs, type ScanResult } from './scanner';
import { getContext } from '../tenancy/context';
import { withWorkspace } from '../tenancy/workspace';

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export interface BatchJob {
  userId: string;
  cvMarkdown: string;
  profile: Record<string, unknown>;
  jobs: Array<{
    id: string;
    jdUrl?: string;
    jdText?: string;
  }>;
}

export interface BatchResult {
  batchId: string;
  evaluations: EvaluationResult[];
  cvRenders: CvRenderResult[];
  totalProcessed: number;
  errors: Array<{ jobId: string; error: string }>;
}

// Queue names
const BATCH_QUEUE_NAME = 'career-ops:batch';
const EVALUATE_QUEUE_NAME = 'career-ops:evaluate';
const CV_RENDER_QUEUE_NAME = 'career-ops:cv-render';
const SCAN_QUEUE_NAME = 'career-ops:scan';

let batchQueue: Queue | null = null;
let evaluateQueue: Queue | null = null;
let cvRenderQueue: Queue | null = null;
let scanQueue: Queue | null = null;

/**
 * Get or create the batch queue
 */
export function getBatchQueue(): Queue {
  if (!batchQueue) {
    batchQueue = new Queue(BATCH_QUEUE_NAME, { connection: REDIS_CONFIG });
  }
  return batchQueue;
}

/**
 * Get or create the evaluate queue
 */
export function getEvaluateQueue(): Queue {
  if (!evaluateQueue) {
    evaluateQueue = new Queue(EVALUATE_QUEUE_NAME, { connection: REDIS_CONFIG });
  }
  return evaluateQueue;
}

/**
 * Get or create the CV render queue
 */
export function getCvRenderQueue(): Queue {
  if (!cvRenderQueue) {
    cvRenderQueue = new Queue(CV_RENDER_QUEUE_NAME, { connection: REDIS_CONFIG });
  }
  return cvRenderQueue;
}

/**
 * Get or create the scan queue
 */
export function getScanQueue(): Queue {
  if (!scanQueue) {
    scanQueue = new Queue(SCAN_QUEUE_NAME, { connection: REDIS_CONFIG });
  }
  return scanQueue;
}

/**
 * Process a batch of job evaluations
 */
export async function processBatch(batch: BatchJob): Promise<BatchResult> {
  const { userId, cvMarkdown, profile, jobs } = batch;
  const batchId = `batch_${Date.now()}`;
  
  const evaluations: EvaluationResult[] = [];
  const cvRenders: CvRenderResult[] = [];
  const errors: Array<{ jobId: string; error: string }> = [];

  // Process each job in the batch (with concurrency control in worker)
  for (const job of jobs) {
    try {
      // Evaluate job
      const evaluation = await evaluateJob(userId, cvMarkdown, profile, {
        jdUrl: job.jdUrl,
        jdText: job.jdText,
      });
      evaluations.push(evaluation);

      // Render CV for this job
      const cvRender = await renderCvForUser(userId, cvMarkdown, {
        jobPostingId: job.id,
      });
      cvRenders.push(cvRender);
    } catch (error) {
      errors.push({
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    batchId,
    evaluations,
    cvRenders,
    totalProcessed: evaluations.length + cvRenders.length,
    errors,
  };
}

/**
 * Create a batch worker
 */
export function createBatchWorker(concurrency: number = 4): Worker {
  const worker = new Worker(
    BATCH_QUEUE_NAME,
    async (job: Job<BatchJob, BatchResult>) => {
      const result = await processBatch(job.data);
      
      // TODO: Persist results to database
      // TODO: Send webhook to lumina on completion
      
      return result;
    },
    {
      connection: REDIS_CONFIG,
      concurrency,
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`Batch job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`Batch job ${job?.id} failed:`, error);
  });

  return worker;
}

/**
 * Add a batch job to the queue
 */
export async function addBatchJob(batch: BatchJob): Promise<string> {
  const queue = getBatchQueue();
  
  // Generate stable job ID for deduplication
  const dedupeKey = createHash('sha256')
    .update(
      JSON.stringify({
        userId: batch.userId,
        jobs: batch.jobs.map((j) => ({ id: j.id, jdUrl: j.jdUrl, jdText: j.jdText })),
      })
    )
    .digest('hex')
    .slice(0, 24);
  const jobId = `batch_${batch.userId}_${dedupeKey}`;
  await queue.add('process-batch', batch, {
    jobId,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  return jobId;
}

/**
 * Close all queues and workers
 */
export async function closeQueues(): Promise<void> {
  await batchQueue?.close();
  await evaluateQueue?.close();
  await cvRenderQueue?.close();
  await scanQueue?.close();
}
