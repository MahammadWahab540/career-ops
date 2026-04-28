/**
 * Evaluation service - wraps modes/oferta.md flow
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { Workspace, withWorkspace } from '../tenancy/workspace';
import { getContext } from '../tenancy/context';

const MODES_DIR = process.env.MODES_DIR || join(process.cwd(), 'modes');

export interface EvaluationOptions {
  jdUrl?: string;
  jdText?: string;
  model?: string;
}

export interface EvaluationResult {
  jobId: string;
  scores: Record<string, number>;
  grade: string;
  report: string;
  model: string;
}

/**
 * Load the oferta.md prompt template
 */
async function loadOfertaPrompt(): Promise<string> {
  return readFile(join(MODES_DIR, 'oferta.md'), 'utf-8');
}

/**
 * Run job evaluation against a career profile
 * This wraps the existing oferta.md flow
 */
export async function runEvaluation(
  workspace: Workspace,
  options: EvaluationOptions
): Promise<EvaluationResult> {
  const context = getContext();
  const { userId } = context || { userId: 'unknown' };

  // Read the prompt template
  const promptTemplate = await loadOfertaPrompt();

  // Read CV and profile from workspace
  const cvMarkdown = await workspace.read('cv.md');
  let profileYaml: string;
  try {
    profileYaml = await workspace.read('config/profile.yml');
  } catch {
    profileYaml = '{}';
  }

  // Get JD content (from URL or direct text)
  const jdContent = options.jdText || `[JD URL: ${options.jdUrl}]`;

  // TODO: Call AI model (Claude/Gemini) with the prompt
  // For now, return placeholder result
  
  const result: EvaluationResult = {
    jobId: `eval_${Date.now()}`,
    scores: {
      roleMatch: 0.8,
      skillsMatch: 0.75,
      experienceLevel: 0.85,
      locationFit: 0.9,
      salaryExpectation: 0.7,
      companyCulture: 0.65,
      growthPotential: 0.8,
      industryFit: 0.75,
      techStack: 0.85,
      overall: 0.78,
    },
    grade: 'B+',
    report: '# Evaluation Report\n\nThis is a placeholder report.',
    model: options.model || 'claude-sonnet-4-5',
  };

  // Write report to workspace
  await workspace.write(`reports/${result.jobId}.md`, result.report);

  return result;
}

/**
 * Evaluate a job posting for a user
 * High-level wrapper that handles workspace setup
 */
export async function evaluateJob(
  userId: string,
  cvMarkdown: string,
  profile: Record<string, unknown>,
  options: EvaluationOptions
): Promise<EvaluationResult> {
  return withWorkspace(userId, async (ws) => {
    // Materialize workspace
    await ws.write('cv.md', cvMarkdown);
    await ws.writeYaml('config/profile.yml', profile);

    // Run evaluation
    return runEvaluation(ws, options);
  });
}
