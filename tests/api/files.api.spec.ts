// Piped input stops one byte past its limit, and a refusal of the system goes to who can solve it.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathIssue, pipedText, writeAll } from '../../cli/files.ts';
import { rejected } from '../../core/errors.ts';

async function* endless() {
  while (true) yield Buffer.alloc(1000, 'a');
}

async function* short() {
  yield Buffer.from('{"id":');
  yield Buffer.from('"awards"}');
}

test('reads piped input whole, and an endless one only to one byte past the limit', async () => {
  assert.equal(await pipedText(short(), 100), '{"id":"awards"}');
  assert.equal((await pipedText(endless(), 2500)).length, 2501);
});

const systemError = (code: string) => Object.assign(new Error(code), { code, syscall: 'open' });

// A path the caller changes fixes a refused path; anything else the system refuses, a full disk
// or a code nobody planned for, is the person's to solve.
test('a refusal of the system goes to the caller for a path, else to the person', () => {
  const kinds = ['EACCES', 'ENOTDIR', 'ENOSPC', 'EIO', 'EUNPLANNED'].map(code => {
    const { error } = rejected('file', [pathIssue(systemError(code), '/x', 'out')]);
    return [code, error.issues[0]?.code, error.refusal.kind];
  });
  assert.deepEqual(kinds, [
    ['EACCES', 'PATH_REFUSED', 'fix'],
    ['ENOTDIR', 'PATH_REFUSED', 'fix'],
    ['ENOSPC', 'SYSTEM_REFUSED', 'ask'],
    ['EIO', 'SYSTEM_REFUSED', 'ask'],
    ['EUNPLANNED', 'SYSTEM_REFUSED', 'ask'],
  ]);
});

// A rename can fail after an earlier one went through; the answer then names what is written.
test('a write that fails after another one names what it wrote, and leaves no temporary file', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'oriko-write-'));
  mkdirSync(join(folder, 'taken'));
  const first = join(folder, 'first.txt');
  const { error } = await writeAll(
    [
      { path: first, content: 'one' },
      { path: join(folder, 'taken'), content: 'two' },
    ],
    'home',
  );
  assert.deepEqual(
    [error?.issues[0]?.code, error?.refusal.state, readdirSync(folder).sort()],
    ['PATH_REFUSED', `Written before the failure: ${first}.`, ['first.txt', 'taken']],
  );
});
