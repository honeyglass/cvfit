/**
 * pnpm baselines:update: a new Google PDF and new page images for every showcase .docx that changed.
 *
 * Run it after a change to a look and after the examples' .docx files are built again. It asks
 * Google only for a .docx whose sha256 differs from its google.json, so an unchanged example
 * costs nothing. The page images need macOS, since images.swift draws them with PDFKit.
 *
 * @example pnpm baselines:update
 */
import { execFile } from 'node:child_process';
import { readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { $try, causeText } from '@honeyglass/utils/ts';
import { googlePdf } from './google.ts';
import { gwsProgram } from './gws.ts';
import { MANIFEST, hashOf, manifestOf, staleBaselines } from './stale.ts';

const run = promisify(execFile);
const SHOWCASE = fileURLToPath(new URL('../examples/showcase', import.meta.url));
const IMAGES = fileURLToPath(new URL('./images.swift', import.meta.url));

/** The README shows the top of this sheet, in a light and a dark version. */
const EXCERPT = {
  docx: 'go-e-senior-backend-terminal.docx',
  light: 'terminal-excerpt.png',
  dark: { file: 'terminal-excerpt-dark.png', background: '0e151e', ink: 'eaf0f5' },
};

const updated = await $try(updateAll());
if (updated.error !== null) {
  console.error(`baselines:update stopped: ${causeText(updated.error)}`);
  process.exitCode = 1;
}

async function updateAll() {
  const stale = await staleBaselines(SHOWCASE);
  if (stale.length === 0) {
    console.log('Every Google PDF matches its .docx; nothing to do.');
    return;
  }
  const gws = await gwsProgram();
  for (const { example, docx, reason } of stale) {
    const folder = join(SHOWCASE, example);
    const pdf = join(folder, docx.replace(/\.docx$/, '.pdf'));
    await writeFile(pdf, await googlePdf(gws, join(folder, docx)));
    await drawImages(folder, docx, pdf);
    await recordHash(folder, docx);
    console.log(`${example}/${docx} (${reason}): new PDF and page images`);
  }
}

// Old page images go first, so a sheet with fewer pages leaves none behind.
async function drawImages(folder: string, docx: string, pdf: string) {
  const prefix = docx.endsWith('-terminal.docx') ? 'terminal-page' : 'page';
  const old = (await readdir(folder)).filter(file =>
    new RegExp(`^${prefix}-\\d+\\.png$`).test(file),
  );
  for (const file of old) await rm(join(folder, file));
  await run('swift', [IMAGES, 'pages', pdf, join(folder, prefix)]);
  if (docx !== EXCERPT.docx) return;
  await run('swift', [IMAGES, 'excerpt', pdf, join(folder, EXCERPT.light)]);
  const { file, background, ink } = EXCERPT.dark;
  await run('swift', [IMAGES, 'excerpt', pdf, join(folder, file), background, ink]);
}

async function recordHash(folder: string, docx: string) {
  const manifest = { ...(await manifestOf(folder)), [docx]: await hashOf(join(folder, docx)) };
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(join(folder, MANIFEST), `${JSON.stringify(sorted, null, 2)}\n`);
}
