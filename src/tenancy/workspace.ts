/**
 * Workspace manager for multi-tenant isolation
 * Creates ephemeral per-user directories, runs operations, then cleans up
 */

import { mkdir, rm, writeFile, readFile, access } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const WORKSPACE_BASE = process.env.WORKSPACE_DIR || '/tmp/co';

export interface Workspace {
  path: string;
  userId: string;
  runId: string;
  write: (filename: string, content: string | Buffer) => Promise<void>;
  writeYaml: (filename: string, data: unknown) => Promise<void>;
  read: (filename: string) => Promise<string>;
  readJson: <T>(filename: string) => Promise<T>;
  exists: (filename: string) => Promise<boolean>;
  cleanup: () => Promise<void>;
}

/**
 * Create a workspace manager instance
 */
async function createWorkspace(userId: string, runId?: string): Promise<Workspace> {
  const actualRunId = runId || randomUUID();
  const workspacePath = join(WORKSPACE_BASE, userId, actualRunId);
  
  // Ensure base directory exists
  await mkdir(workspacePath, { recursive: true });
  
  // Create standard subdirectories
  await mkdir(join(workspacePath, 'config'), { recursive: true });
  await mkdir(join(workspacePath, 'data'), { recursive: true });
  await mkdir(join(workspacePath, 'output'), { recursive: true });
  await mkdir(join(workspacePath, 'reports'), { recursive: true });
  
  return {
    path: workspacePath,
    userId,
    runId: actualRunId,
    
    async write(filename: string, content: string | Buffer): Promise<void> {
      const fullPath = join(workspacePath, filename);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, content);
    },
    
    async writeYaml(filename: string, data: unknown): Promise<void> {
      const yaml = await import('js-yaml');
      const content = yaml.dump(data);
      await this.write(filename, content);
    },
    
    async read(filename: string): Promise<string> {
      const fullPath = join(workspacePath, filename);
      return readFile(fullPath, 'utf-8');
    },
    
    async readJson<T>(filename: string): Promise<T> {
      const content = await this.read(filename);
      return JSON.parse(content) as T;
    },
    
    async exists(filename: string): Promise<boolean> {
      const fullPath = join(workspacePath, filename);
      try {
        await access(fullPath);
        return true;
      } catch {
        return false;
      }
    },
    
    async cleanup(): Promise<void> {
      try {
        await rm(workspacePath, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to cleanup workspace ${workspacePath}:`, error);
      }
    },
  };
}

/**
 * Execute a function with an ephemeral workspace
 * The workspace is automatically cleaned up after the function completes
 */
export async function withWorkspace<T>(
  userId: string,
  fn: (ws: Workspace) => Promise<T>,
  runId?: string
): Promise<T> {
  const ws = await createWorkspace(userId, runId);
  
  try {
    return await fn(ws);
  } finally {
    await ws.cleanup();
  }
}

/**
 * Janitor function to clean up stale workspaces
 * Should be called on boot and periodically via cron
 */
export async function cleanupStaleWorkspaces(maxAgeMs: number = 3600000): Promise<void> {
  const { readdir, stat } = await import('fs/promises');
  
  try {
    if (!existsSync(WORKSPACE_BASE)) {
      return;
    }
    
    const tenantDirs = await readdir(WORKSPACE_BASE);
    const now = Date.now();
    
    for (const tenantDir of tenantDirs) {
      const tenantPath = join(WORKSPACE_BASE, tenantDir);
      const tenantStat = await stat(tenantPath);
      
      if (!tenantStat.isDirectory()) {
        continue;
      }
      
      const runDirs = await readdir(tenantPath);
      
      for (const runDir of runDirs) {
        const runPath = join(tenantPath, runDir);
        const runStat = await stat(runPath);
        
        if (!runStat.isDirectory()) {
          continue;
        }
        
        const age = now - runStat.mtimeMs;
        if (age > maxAgeMs) {
          await rm(runPath, { recursive: true, force: true });
          console.log(`Cleaned up stale workspace: ${runPath}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup stale workspaces:', error);
  }
}

/**
 * Get workspace paths helper for migrating existing scripts
 */
export function getPaths(workspacePath: string) {
  return {
    root: workspacePath,
    cv: join(workspacePath, 'cv.md'),
    profile: join(workspacePath, 'config', 'profile.yml'),
    data: join(workspacePath, 'data'),
    output: join(workspacePath, 'output'),
    reports: join(workspacePath, 'reports'),
  };
}
