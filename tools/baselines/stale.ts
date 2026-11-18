/**
 * Which Google PDFs of the showcase no longer match the .docx they were made from.
 *
 * staleBaselines: every .docx of the showcase whose Google PDF is missing from google.json or older.
 * MANIFEST, hashOf, manifestOf: the file that holds the hashes, and how to read a hash and the file.
 *
 * The PDFs come from Google Docs and are the baselines the PDF test compares LibreOffice with.
 * google.json in each example folder maps a .docx to the sha256 it had when Google set its PDF,
 * so a changed look shows up byte for byte, without asking Google.
 *
 * @example const stale = await staleBaselines(SHOWCASE);
 */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { $try, RefusalError, causeText } from '@honeyglass/utils/ts';
import { Manifest } from './manifest.schema.ts';

export const MANIFEST = 'google.json';

export type Stale = { example: string; docx: string; reason: 'missing' | 'changed' };

/**
 * @param showcase - the folder with one folder per example
 * @returns each .docx whose PDF needs Google again, sorted by example and file name
 * @throws RefusalError when a google.json is not one sha256 per .docx
 */
export async function staleBaselines(showcase: string) {
  const stale: Stale[] = [];
  for (const example of (await readdir(showcase)).sort()) {
    const folder = join(showcase, example);
    const manifest = await manifestOf(folder);
    const files = (await readdir(folder)).filter(file => file.endsWith('.docx')).sort();
    for (const docx of files) {
      const recorded = manifest[docx];
      if (recorded === undefined) stale.push({ example, docx, reason: 'missing' });
      else if (recorded !== (await hashOf(join(folder, docx))))
        stale.push({ example, docx, reason: 'changed' });
    }
  }
  return stale;
}

/** @returns the sha256 of a file in lower-case hex */
export async function hashOf(path: string) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

/**
 * @param folder - one example folder
 * @returns its google.json, or an empty one when the file is missing
 * @throws RefusalError when the file is no sha256 per .docx
 */
export async function manifestOf(folder: string): Promise<Manifest> {
  const path = join(folder, MANIFEST);
  const text = await $try(readFile(path, 'utf8'), { or: '{}', expected: isMissing });
  const parsed = Manifest.safeParse(JSON.parse(text));
  if (parsed.success) return parsed.data;
  throw new RefusalError({
    kind: 'fix',
    step: 'baselines',
    reason: `${path} is not one sha256 per .docx: ${causeText(parsed.error)}`,
    next: `Fix ${path}, or delete it and run pnpm baselines:update`,
  });
}

const isMissing = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';
