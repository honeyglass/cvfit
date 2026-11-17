import assert from 'node:assert/strict';
import { cpSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { NEW_CV, call, piped, terminal, workspace } from '../utils/cli.ts';
import type { Space } from '../utils/cli.ts';

type Step = { does: string; command?: string; needs?: string[] };

const steps = async (space: Space, argv: string[]) => {
  const { next } = (await call(space, argv)).answer;
  return Array.isArray(next) ? next : [];
};
const shapes = (next: Step[]) => next.map(step => [step.command ?? null, step.needs ?? []]);

test('a success names its next steps, each a command with what it still needs', async () => {
  const space = workspace();
  const cases: [string[], [string | null, string[]][]][] = [
    [
      [],
      [
        ['oriko profiles', []],
        ['oriko cvs', []],
      ],
    ],
    [
      ['cvs'],
      [
        ['oriko show --cv jane', []],
        ['oriko profiles', []],
      ],
    ],
    [['profiles'], [['oriko plan', ['profile']]]],
    [['show'], [['oriko show', ['block']]]],
    [
      ['plan', '--profile', 'acme'],
      [
        ['oriko preview --profile acme', []],
        ['oriko build --profile acme', ['out']],
      ],
    ],
    [['preview', '--profile', 'acme'], [['oriko build --profile acme', ['out']]]],
    [['build', '--profile', 'acme', '--out', 'acme.docx'], [[null, []]]],
    [['build', '--profile', 'acme', '--out', 'acme.docx', '--dry-run'], [[null, []]]],
    [
      ['init', '--cv', 'erika', '--json', NEW_CV],
      [
        ['oriko contact add --cv erika', ['json']],
        ['oriko block add --cv erika', ['json']],
        ['oriko photo set --cv erika', ['file']],
      ],
    ],
    [
      ['cvs'],
      [
        ['oriko show', ['cv']],
        ['oriko profiles', []],
      ],
    ],
  ];
  for (const [argv, expected] of cases)
    assert.deepEqual(shapes(await steps(space, argv)), expected, argv.join(' '));
});

test('an answer with nothing to follow names no step', async () => {
  const space = workspace();
  for (const argv of [['schema'], ['show', '--block', 'awards'], ['show', '--cv'], ['block']])
    assert.equal((await call(space, argv)).answer.next, undefined, argv.join(' '));
});

// A step either runs as it stands, or is refused for what it still needs; it is never unknown.
// A step keeps every selector of the call, or a profile without a CV loses the one it needs.
test('every next command is a call oriko knows', async () => {
  const space = workspace();
  const answers = [[], ['cvs'], ['profiles'], ['show'], ['plan', '--profile', 'acme']];
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  writeFileSync(join(space.home, 'profiles', 'open.json'), '{}');
  answers.push(['plan', '--profile', 'open', '--cv', 'erika']);
  const commands = [];
  for (const argv of answers) commands.push(...(await steps(space, argv)));
  for (const step of commands) {
    if (step.command === undefined) continue;
    const { exit, codes } = await call(space, step.command.split(' ').slice(1));
    const isUnknown = codes.some(code =>
      ['UNKNOWN_COMMAND', 'UNKNOWN_OPTION', 'OPTION_NOT_ALLOWED', 'UNEXPECTED_ARGUMENT'].includes(
        code,
      ),
    );
    assert.deepEqual([exit < 2, isUnknown], [true, false], step.command);
    if (step.needs === undefined) assert.equal(exit, 0, step.command);
  }
});

// A value from the call or the data folder goes into a command as the shell and oriko read it
// back, never as shell code: quoted, and joined by '=' where it starts with a dash.
test('the steps keep the data folder of the call', async () => {
  const space = workspace();
  const next = await steps(space, ['plan', '--profile', 'acme', '--home', space.home]);
  assert.equal(next[0]?.command, `oriko preview --profile acme --home ${space.home}`);
  const dashed = join(space.cwd, '-data');
  cpSync(space.home, dashed, { recursive: true });
  renameSync(join(dashed, 'cvs', 'jane.json'), join(dashed, 'cvs', 'x;touch PWNED.json'));
  cpSync(space.home, join(space.cwd, '~'), { recursive: true });
  const cv = `--cv 'x;touch PWNED'`;
  assert.equal(
    (await steps(space, ['cvs', '--home=-data']))[0]?.command,
    `oriko show ${cv} --home=-data`,
  );
  const [issue] =
    (await call(space, ['show', '--block', 'nobody', '--home=-data'])).answer.issues ?? [];
  assert.equal(issue?.command, `oriko show ${cv} --block --home=-data`);
  assert.equal(
    (await steps(space, ['profiles', '--home', '~']))[0]?.command,
    `oriko plan --home '~'`,
  );
});

test('a terminal shows the steps below the answer, and piped text leaves them out', async () => {
  const space = workspace();
  const shown = await terminal(space, ['preview', '--profile', 'acme']);
  assert.match(shown, /\nNext: oriko build --profile acme \(needs --out\)\n$/);
  const text = await piped(space, ['preview', '--profile', 'acme', '--output', 'text']);
  assert.equal(text.includes('Next:'), false);
});
