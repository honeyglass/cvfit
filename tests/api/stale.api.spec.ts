import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { staleBaselines } from '../../tools/baselines/stale.ts';

const SHOWCASE = fileURLToPath(new URL('../../examples/showcase', import.meta.url));

// A copy of the showcase, so a case may change a file without touching the repository.
function showcaseCopy() {
  const folder = mkdtempSync(join(tmpdir(), 'oriko-baselines-'));
  cpSync(SHOWCASE, folder, { recursive: true });
  return folder;
}

test('finds every Google PDF of the showcase made from the .docx beside it', async () => {
  assert.deepEqual(await staleBaselines(SHOWCASE), []);
});

test('names a .docx that changed after Google set its PDF, and one no google.json lists', async () => {
  const folder = showcaseCopy();
  writeFileSync(join(folder, 'galeria-cook', 'galeria-cook-terminal.docx'), 'changed');
  rmSync(join(folder, 'davita-it-project-manager', 'google.json'));
  assert.deepEqual(await staleBaselines(folder), [
    {
      example: 'davita-it-project-manager',
      docx: 'davita-it-project-manager-terminal.docx',
      reason: 'missing',
    },
    {
      example: 'davita-it-project-manager',
      docx: 'davita-it-project-manager.docx',
      reason: 'missing',
    },
    { example: 'galeria-cook', docx: 'galeria-cook-terminal.docx', reason: 'changed' },
  ]);
  rmSync(folder, { recursive: true });
});

test('refuses a google.json that holds no sha256 per .docx', async () => {
  const folder = showcaseCopy();
  writeFileSync(join(folder, 'galeria-cook', 'google.json'), '{"galeria-cook.docx": "abc"}');
  await assert.rejects(staleBaselines(folder), /galeria-cook\/google\.json/);
  rmSync(folder, { recursive: true });
});
