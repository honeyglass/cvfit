import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

// The two badges with a fixed number, read back against the file that sets the number.
test('the README badges state the Node version and the coverage that package.json sets', () => {
  const readme = readFileSync(`${ROOT}README.md`, 'utf8');
  const pkg: { engines: { node: string }; scripts: { test: string } } = JSON.parse(
    readFileSync(`${ROOT}package.json`, 'utf8'),
  );
  const node = /^>=(\d+)$/.exec(pkg.engines.node)?.[1];
  const lines = /--test-coverage-lines=(\d+)/.exec(pkg.scripts.test)?.[1];
  assert.ok(readme.includes(`img.shields.io/badge/node-${node}+-`), `node badge for ${node}+`);
  assert.ok(readme.includes(`coverage-%E2%89%A5${lines}%25`), `coverage badge for ${lines}%`);
});
