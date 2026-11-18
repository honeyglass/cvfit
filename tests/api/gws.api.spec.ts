import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { readRefusal } from '@honeyglass/utils/ts';
import { gwsProgram } from '../../baselines/gws.ts';

const cache = () => mkdtempSync(join(tmpdir(), 'oriko-gws-'));
const unused = async () => assert.fail('nothing may be downloaded');

// The kind and step a refusal carries, read from the text of the error it throws.
async function refusalOf(call: Promise<unknown>) {
  const error = await call.then(
    () => assert.fail('expected a refusal'),
    (thrown: unknown) => thrown,
  );
  assert.ok(error instanceof Error);
  return readRefusal(error.message);
}

test('refuses a system the release table has no archive for, before any download', async () => {
  const refusal = await refusalOf(gwsProgram(cache(), 'linux-x64', unused));
  assert.deepEqual([refusal?.kind, refusal?.step], ['ask', 'baselines']);
  assert.match(refusal?.reason ?? '', /linux-x64/);
});

test('refuses an archive whose sha256 differs, and keeps nothing of it', async () => {
  const folder = cache();
  const refusal = await refusalOf(
    gwsProgram(folder, 'darwin-arm64', async () => new TextEncoder().encode('not gws')),
  );
  assert.deepEqual([refusal?.kind, refusal?.step], ['ask', 'baselines']);
  assert.equal(existsSync(join(folder, 'gws-0.22.5-darwin-arm64')), false);
  rmSync(folder, { recursive: true });
});
