/**
 * CV Render service - wraps modes/pdf.md (LaTeX) flow
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { Workspace, withWorkspace } from '../tenancy/workspace';
import { getContext } from '../tenancy/context';
import { createHash } from 'crypto';

const MODES_DIR = process.env.MODES_DIR || join(process.cwd(), 'modes');
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || join(process.cwd(), 'templates');
const FONTS_DIR = process.env.FONTS_DIR || join(process.cwd(), 'fonts');

export interface CvRenderOptions {
  template?: string;
  jobPostingId?: string;
}

export interface CvRenderResult {
  renderId: string;
  pdfKey: string;
  sha: string;
  templateVersion: string;
}

/**
 * Load the pdf.md prompt template
 */
async function loadPdfPrompt(): Promise<string> {
  return readFile(join(MODES_DIR, 'pdf.md'), 'utf-8');
}

/**
 * Load LaTeX template
 */
async function loadLatexTemplate(templateName: string = 'cv-template.tex'): Promise<string> {
  return readFile(join(TEMPLATES_DIR, templateName), 'utf-8');
}

/**
 * Generate content hash for deduplication
 */
function generateContentHash(cvMarkdown: string, template: string): string {
  return createHash('sha256')
    .update(cvMarkdown)
    .update(template)
    .digest('hex');
}

/**
 * Render CV to PDF using LaTeX
 * This wraps the existing pdf.md flow
 */
export async function renderCv(
  workspace: Workspace,
  options: CvRenderOptions = {}
): Promise<CvRenderResult> {
  const context = getContext();
  const { userId } = context || { userId: 'unknown' };

  // Read CV from workspace
  const cvMarkdown = await workspace.read('cv.md');
  
  // Load LaTeX template
  const templateName = options.template || 'cv-template.tex';
  const latexTemplate = await loadLatexTemplate(templateName);

  // Generate hash for deduplication
  const sha = generateContentHash(cvMarkdown, latexTemplate);

  // Check if we already have this render (deduplication)
  // TODO: Query database for existing render with same sha
  // const existing = await fastify.prisma.cvRender.findFirst({
  //   where: { userId, sha },
  // });
  // if (existing) {
  //   return {
  //     renderId: existing.id,
  //     pdfKey: existing.pdfKey,
  //     sha: existing.sha,
  //     templateVersion: existing.templateVersion,
  //   };
  // }

  const renderId = `render_${Date.now()}`;
  const pdfKey = `cv-renders/${userId}/${renderId}.pdf`;

  // TODO: Actually compile LaTeX to PDF
  // This would involve:
  // 1. Converting markdown to LaTeX
  // 2. Running pdflatex/xelatex with the template
  // 3. Copying fonts
  // For now, create a placeholder

  await workspace.write(`output/${renderId}.pdf`, Buffer.from('%PDF placeholder'));

  // Upload to object storage (TODO: implement)
  // await uploadObject(pdfKey, pdfBuffer, 'application/pdf');

  return {
    renderId,
    pdfKey,
    sha,
    templateVersion: '1.0.0',
  };
}

/**
 * Render CV for a user
 * High-level wrapper that handles workspace setup
 */
export async function renderCvForUser(
  userId: string,
  cvMarkdown: string,
  options: CvRenderOptions = {}
): Promise<CvRenderResult> {
  return withWorkspace(userId, async (ws) => {
    // Materialize workspace
    await ws.write('cv.md', cvMarkdown);

    // Render CV
    return renderCv(ws, options);
  });
}
