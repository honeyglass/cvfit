import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** The folders with rules of their own; every other top-level folder with code is a feature. */
const SHELL = new Set(['bin', 'cli', 'tests', 'tools']);
const SKIPPED = new Set(['node_modules', '.git']);

// Each relative import of a .ts file in one top-level folder that leaves the allowed folders.
function crossings(root: string, folder: string, allowed: Set<string>) {
  const found: string[] = [];
  const files = readdirSync(join(root, folder), { recursive: true, encoding: 'utf8' });
  for (const file of files.filter(name => name.endsWith('.ts'))) {
    const path = join(root, folder, file);
    for (const [, spec = ''] of readFileSync(path, 'utf8').matchAll(/from\s+'(\.\.?\/[^']+)'/g)) {
      const reached = relative(root, resolve(dirname(path), spec)).split(sep)[0] ?? '';
      if (allowed.has(reached) === false) found.push(`${folder}/${file} imports ${spec}`);
    }
  }
  return found;
}

// Every top-level folder that holds a .ts file and has no rule of its own.
function features(root: string) {
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => SHELL.has(name) === false && name !== 'core' && SKIPPED.has(name) === false)
    .filter(name =>
      readdirSync(join(root, name), { recursive: true }).some(f => `${f}`.endsWith('.ts')),
    )
    .sort();
}

test('a feature imports only core and itself', () => {
  const found = features(ROOT).flatMap(name => crossings(ROOT, name, new Set(['core', name])));
  assert.deepEqual(found, []);
});

test('core imports only core', () => {
  assert.deepEqual(crossings(ROOT, 'core', new Set(['core'])), []);
});

test('names a feature that imports another feature, and counts a new folder as a feature', () => {
  const root = mkdtempSync(join(tmpdir(), 'oriko-layout-'));
  for (const name of ['core', 'classic', 'brand-new']) mkdirSync(join(root, name));
  writeFileSync(join(root, 'core', 'errors.ts'), 'export const x = 1;\n');
  writeFileSync(join(root, 'classic', 'docx.ts'), "import { x } from '../core/errors.ts';\n");
  writeFileSync(join(root, 'brand-new', 'a.ts'), "import { y } from '../classic/docx.ts';\n");
  assert.deepEqual(features(root), ['brand-new', 'classic']);
  assert.deepEqual(crossings(root, 'brand-new', new Set(['core', 'brand-new'])), [
    'brand-new/a.ts imports ../classic/docx.ts',
  ]);
  assert.deepEqual(crossings(root, 'classic', new Set(['core', 'classic'])), []);
  rmSync(root, { recursive: true });
});
