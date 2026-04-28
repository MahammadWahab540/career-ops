/**
 * Scanner service - wraps modes/scan.md (Playwright) flow
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { Workspace, withWorkspace } from '../tenancy/workspace';
import { getContext } from '../tenancy/context';

const MODES_DIR = process.env.MODES_DIR || join(process.cwd(), 'modes');

export interface ScanOptions {
  sources?: Array<'linkedin' | 'indeed' | 'glassdoor' | 'company_sites'>;
  limit?: number;
  locations?: string[];
  keywords?: string[];
}

export interface JobDiscovery {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  jdText?: string;
  postedDate?: Date;
}

export interface ScanResult {
  scanId: string;
  jobs: JobDiscovery[];
  totalFound: number;
}

/**
 * Load the scan.md prompt template
 */
async function loadScanPrompt(): Promise<string> {
  return readFile(join(MODES_DIR, 'scan.md'), 'utf-8');
}

/**
 * Run job discovery scan using Playwright
 * This wraps the existing scan.md flow
 */
export async function runScan(
  workspace: Workspace,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const context = getContext();
  const { userId } = context || { userId: 'unknown' };

  // Read profile from workspace to get preferences
  let profileYaml: string;
  try {
    profileYaml = await workspace.read('config/profile.yml');
  } catch {
    profileYaml = '{}';
  }

  const scanId = `scan_${Date.now()}`;
  const limit = options.limit || 50;
  const sources = options.sources || ['linkedin', 'indeed', 'glassdoor'];

  // TODO: Implement actual Playwright scraping
  // For now, return placeholder results
  
  const jobs: JobDiscovery[] = [];

  // Placeholder job discoveries
  for (let i = 0; i < Math.min(limit, 5); i++) {
    jobs.push({
      id: `job_${scanId}_${i}`,
      title: `Software Engineer ${i + 1}`,
      company: `Tech Company ${i + 1}`,
      location: options.locations?.[0] || 'Remote',
      url: `https://example.com/job/${i}`,
      source: sources[i % sources.length],
      postedDate: new Date(),
    });
  }

  // Write discovered jobs to workspace
  await workspace.writeJson(`data/discovered_jobs_${scanId}.json`, jobs);

  return {
    scanId,
    jobs,
    totalFound: jobs.length,
  };
}

/**
 * Run job scan for a user
 * High-level wrapper that handles workspace setup
 */
export async function scanJobs(
  userId: string,
  profile: Record<string, unknown>,
  options: ScanOptions = {}
): Promise<ScanResult> {
  return withWorkspace(userId, async (ws) => {
    // Materialize workspace
    await ws.writeYaml('config/profile.yml', profile);

    // Run scan
    return runScan(ws, options);
  });
}
