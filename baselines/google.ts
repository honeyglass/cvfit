/**
 * The PDF Google Docs makes of a .docx, through the gws CLI pinned to one commit.
 *
 * googlePdf: uploads the .docx as a Google Doc, exports it as PDF and moves the Doc to the trash.
 *
 * This file and gws.ts are the only ones that know gws. gws keeps the Google sign-in itself,
 * encrypted, so oriko never sees a token. The Doc goes to the trash and not away for good, so a
 * person can still find it after a failed run.
 *
 * @example const pdf = await googlePdf(await gwsProgram(), 'examples/showcase/galeria-cook/galeria-cook.docx');
 */
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { $try, RefusalError, causeText } from '@honeyglass/utils/ts';
import { Created } from './google.schema.ts';

const run = promisify(execFile);

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const GOOGLE_DOC = 'application/vnd.google-apps.document';

/**
 * @param program - the path of the gws program, from gwsProgram()
 * @param docx - the path of a .docx
 * @returns the bytes of the PDF Google Docs exports
 * @throws RefusalError when gws fails, such as without a sign-in
 */
export async function googlePdf(program: string, docx: string) {
  const id = await uploaded(program, docx);
  const folder = await mkdtemp(join(tmpdir(), 'oriko-google-'));
  const pdf = join(folder, 'export.pdf');
  const exportArgs = ['export', '--params', params(id, 'application/pdf'), '--output', pdf];
  const exported = await $try(files(program, exportArgs));
  await files(program, ['update', '--params', params(id), '--json', '{"trashed":true}']);
  const bytes = exported.error === null ? await readFile(pdf) : null;
  await rm(folder, { recursive: true, force: true });
  if (bytes === null) throw exported.error;
  return bytes;
}

// The metadata names the Google Doc type and the content its own, so Drive converts on upload.
async function uploaded(program: string, docx: string) {
  const name = `oriko-baseline-${basename(docx, '.docx')}`;
  const body = JSON.stringify({ name, mimeType: GOOGLE_DOC });
  const args = ['create', '--json', body, '--upload', docx, '--upload-content-type', DOCX];
  const created = Created.safeParse(JSON.parse(await files(program, args)));
  if (created.success) return created.data.id;
  throw gwsRefused(`files create answered no file id: ${causeText(created.error)}`);
}

const params = (fileId: string, mimeType?: string) => JSON.stringify({ fileId, mimeType });

// One Drive files call; an export writes its binary answer to the path after --output.
async function files(program: string, args: string[]) {
  const answer = await $try(run(program, ['drive', 'files', ...args], { maxBuffer: 10_000_000 }));
  if (answer.error !== null) throw gwsRefused(`gws drive files ${args[0]} failed`, answer.error);
  return answer.data.stdout;
}

const gwsRefused = (reason: string, cause?: unknown) =>
  new RefusalError({
    kind: 'ask',
    step: 'baselines',
    reason,
    next: 'If gws says nobody is signed in, ask the person to run: pnpm baselines:gws auth login; then run pnpm baselines:update again',
    state: 'The PDFs written before this one stay; this .docx keeps its old hash.',
    cause,
  });
