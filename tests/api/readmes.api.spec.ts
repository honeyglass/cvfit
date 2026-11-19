import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SKIP, update } from '../../tools/readmes/update.ts';
import { repository } from '../utils/repository.ts';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const NONE = '- **Uses:** nothing outside itself.\n- **Used by:** no folder.';

// A folder README with the three sections, a body for Modules and one for Connections.
function readme(modules: string, connections = NONE) {
  return [
    '# a/',
    'What a/ is for.',
    `## Modules\n\n${modules}`,
    '## Example\n\nA call.',
    `## Connections\n\n${connections}`,
    '---\n\n[Back](../README.md)\n',
  ].join('\n\n');
}

const read = (root: string, path: string) => readFileSync(join(root, path), 'utf8');
const codes = (messages: string[]) => messages.map(message => message.split(' ')[0]);

test('every folder README matches the code', () => {
  assert.deepEqual(update(ROOT, ['--check'], SKIP).messages, []);
});

test('writes a new file as a bullet without a sentence, and hands its comments to the writer', () => {
  const root = repository({
    'README.md': '# root\n',
    'a/README.md': readme('- `old.ts`: does the old thing.'),
    'a/old.ts': 'export const old = 1;\n',
    'a/new.ts': [
      '/**\n * The new thing.\n */',
      '/** Makes one. */\nexport function make() {}',
      'export const plain = 1;',
    ].join('\n'),
  });
  const result = update(root, [], []);
  assert.match(read(root, 'a/README.md'), /- `old.ts`: does the old thing.\n- `new.ts`:\n/);
  assert.deepEqual(codes(result.messages), ['NO_SENTENCE']);
  assert.deepEqual(
    result.gaps.map(gap => [gap.file, gap.header, gap.exports.map(item => item.name)]),
    [['a/new.ts', '/**\n * The new thing.\n */', ['make']]],
  );
  rmSync(root, { recursive: true });
});

test('keeps each sentence and the order, and drops the bullet of a removed file', () => {
  const kept = '- `b.ts`: reads [the docs](../README.md), and goes on\n  over two lines.';
  const root = repository({
    'README.md': '# root\n',
    'a/README.md': readme(`- \`gone.ts\`: was here.\n${kept}\n- \`a.ts\`: comes last.`),
    'a/a.ts': 'export const a = 1;\n',
    'a/b.ts': 'export const b = 1;\n',
  });
  assert.equal(update(root, [], []).failed, false);
  assert.match(
    read(root, 'a/README.md'),
    /## Modules\n\n- `b.ts`: reads .*\n  over two lines.\n- `a.ts`: comes last.\n\n## Example/,
  );
  rmSync(root, { recursive: true });
});

test('writes both directions of an import, and leaves the skipped folders out', () => {
  const root = repository({
    'README.md': '# root\n',
    'a/README.md': readme('- `a.ts`: uses core.'),
    'a/a.ts': "import { x } from '../core/x.ts';\n",
    'core/README.md': readme('- `x.ts`: is used.'),
    'core/x.ts': 'export const x = 1;\n',
    'tests/a.spec.ts': "import { a } from '../a/a.ts';\n",
  });
  assert.equal(update(root, [], ['tests']).failed, false);
  assert.match(
    read(root, 'a/README.md'),
    /- \*\*Uses:\*\*\n  - \[core\/\]\(\.\.\/core\/README\.md\): imports `x.ts`\n- \*\*Used by:\*\* no folder\./,
  );
  assert.match(
    read(root, 'core/README.md'),
    /- \*\*Used by:\*\*\n  - \[a\/\]\(\.\.\/a\/README\.md\): imports `x.ts`\n/,
  );
  rmSync(root, { recursive: true });
});

test('--check writes nothing and fails on a connection written by hand', () => {
  const claimed =
    '- **Uses:** [core/](../core/README.md) for everything.\n- **Used by:** no folder.';
  const root = repository({
    'README.md': '# root\n',
    'a/README.md': readme('- `a.ts`: alone.', claimed),
    'a/a.ts': 'export const a = 1;\n',
    'core/README.md': readme('- `x.ts`: alone.'),
    'core/x.ts': 'export const x = 1;\n',
  });
  const before = read(root, 'a/README.md');
  assert.deepEqual(update(root, ['--check'], []).messages, [
    'STALE a/README.md: run pnpm readmes to write it',
  ]);
  assert.equal(read(root, 'a/README.md'), before);
  rmSync(root, { recursive: true });
});

test('refuses a README it cannot read, and leaves it as it was', () => {
  const prose = readme('All files are small.');
  const root = repository({
    'README.md': '# root\n',
    'a/README.md': prose,
    'a/a.ts': 'export const a = 1;\n',
    'b/README.md': '# b/\n\n## Modules\n\n- `b.ts`: one.\n\n## Modules\n\n- `b.ts`: two.\n',
    'b/b.ts': 'export const b = 1;\n',
    'c/c.ts': 'export const c = 1;\n',
    'd/README.md': readme('- `d.ts`: <b>bold</b>.'),
    'd/d.ts': 'export const d = 1;\n',
    'e/README.md': readme('- `e.ts`: one.\n  - nested'),
    'e/e.ts': 'export const e = await import(name);\n',
  });
  const result = update(root, [], []);
  assert.deepEqual(codes(result.messages), [
    'DYNAMIC_IMPORT',
    'UNREADABLE_SECTION',
    'TWO_SECTIONS',
    'NO_SECTION',
    'NO_SECTION',
    'NO_README',
    'HTML',
    'UNREADABLE_SECTION',
  ]);
  assert.equal(read(root, 'a/README.md'), prose);
  rmSync(root, { recursive: true });
});

test('names every link that leads nowhere', () => {
  const links = [
    '[web](https://example.com) [mail](mailto:a@b.c) [file](a.ts) [here](#modules)',
    '[heading](../other.md#-compatibility) [second](../other.md#setup-1) [icon](../other.md#-docs) [space](../my%20file.md)',
    '[missing](nope.ts) [outside](../../x.md) [anchor](#nope) [their anchor](../other.md#nope)',
    '[code anchor](a.ts#x) [scheme](ftp://x) [empty](#) [broken](%E0%A4%A.md)',
  ].join('\n');
  const root = repository({
    'README.md': '# root\n',
    'other.md':
      '# other\n\n## 🔌 Compatibility\n\nSetup\n=====\n\n## Setup\n\n## <img src="i.svg" alt=""> Docs\n',
    'my file.md': '# mine\n',
    'a/README.md': readme('- `a.ts`: links.').replace('What a/ is for.', links),
    'a/a.ts': 'export const a = 1;\n',
  });
  const result = update(root, ['--check'], []);
  assert.deepEqual(
    result.messages.map(
      message => message.split(':')[0] + message.split('The link ')[1]?.split(' ')[0],
    ),
    [
      'DEAD_LINK a/README.md' + 'nope.ts',
      'DEAD_LINK a/README.md' + '../../x.md',
      'DEAD_LINK a/README.md' + '#nope',
      'DEAD_LINK a/README.md' + '../other.md#nope',
      'DEAD_LINK a/README.md' + 'a.ts#x',
      'DEAD_LINK a/README.md' + 'ftp://x',
      'DEAD_LINK a/README.md' + '#',
      'DEAD_LINK a/README.md' + '%E0%A4%A.md',
    ],
  );
  rmSync(root, { recursive: true });
});

test('refuses an argument it does not know, and runs nothing', () => {
  const result = update(ROOT, ['--fix'], SKIP);
  assert.equal(result.failed, true);
  assert.deepEqual(result.messages, ['Unknown argument --fix; only --check is known']);
});
