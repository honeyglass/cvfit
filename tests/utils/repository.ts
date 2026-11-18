/**
 * A repository in a temporary folder, for the tests of the tools that read one.
 *
 * repository: the folder, made from a map of paths to file contents.
 *
 * @example const root = repository({ 'core/errors.ts': 'export const x = 1;\n' });
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * @param files - each file's path from the root, and its text
 * @returns the root of the new repository; the caller removes it
 */
export function repository(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'oriko-repository-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}
