import assert from 'node:assert/strict';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { z } from 'zod';
import { run } from '../../cli/run.ts';
import { FIXTURE_URL, photo } from '../utils/fixture.ts';

const Answer = z.looseObject({
  ok: z.boolean(),
  issues: z
    .array(z.looseObject({ code: z.string(), path: z.string(), command: z.string().optional() }))
    .optional(),
});

// A data folder with the reference CV 'jane' and two profiles, and an empty working directory.
const workspace = () => {
  const home = mkdtempSync(join(tmpdir(), 'oriko-home-'));
  const cwd = mkdtempSync(join(tmpdir(), 'oriko-cwd-'));
  mkdirSync(join(home, 'cvs'));
  const master = readFileSync(FIXTURE_URL, 'utf8').replace('"photo.png"', '"cvs/jane.png"');
  writeFileSync(join(home, 'cvs', 'jane.json'), master);
  writeFileSync(join(home, 'cvs', 'jane.png'), photo());
  mkdirSync(join(home, 'profiles'));
  writeFileSync(
    join(home, 'profiles', 'acme.json'),
    JSON.stringify({ cv: 'jane', blocks: { freelance: { hidden: true } } }),
  );
  writeFileSync(
    join(home, 'profiles', 'broken.json'),
    JSON.stringify({ blocks: { nobody: { hidden: true } } }),
  );
  return { home, cwd };
};

const call = async (
  { home, cwd }: ReturnType<typeof workspace>,
  argv: string[],
  stdin: string | null = null,
) => {
  let out = '';
  const exit = await run(argv, {
    home,
    cwd,
    isTTY: false,
    stdin: async () => stdin,
    write: text => (out += text),
  });
  const answer = Answer.parse(JSON.parse(out));
  return { exit, answer, codes: answer.issues?.map(issue => issue.code) ?? [] };
};

const tall = (cwd: string) => {
  const path = join(cwd, 'tall.png');
  writeFileSync(path, PNG.sync.write(new PNG({ width: 10, height: 30 })));
  return path;
};

const NEW_CV = JSON.stringify({
  language: 'de',
  firstName: 'Erika',
  lastName: 'Muster',
  role: 'Entwicklerin',
});

test('plan answers the pages of the only CV, and of a profile by its name', async () => {
  const space = workspace();
  const { exit, answer } = await call(space, ['plan']);
  assert.deepEqual(
    [exit, answer.ok, Array.isArray(answer.pages) && answer.pages.length],
    [0, true, 2],
  );
  const profiled = await call(space, ['plan', '--profile', 'acme']);
  assert.equal(JSON.stringify(profiled.answer.pages).includes('freelance'), false);
});

test('cvs lists every CV with its language and whether it fits', async () => {
  const { answer } = await call(workspace(), ['cvs']);
  assert.deepEqual(answer.cvs, [
    { name: 'jane', language: 'en', person: 'Jane Doe', fits: true, pages: 2 },
  ]);
});

test('profiles lists every profile with its CV and whether it can be built', async () => {
  const { answer } = await call(workspace(), ['profiles']);
  assert.deepEqual(answer.profiles, [
    { name: 'acme', cv: 'jane', fits: true, pages: 2 },
    { name: 'broken', cv: 'jane', fits: false, issues: ['UNKNOWN_BLOCK'] },
  ]);
});

test('init creates a new CV that builds, and the edit commands fill it', async () => {
  const space = workspace();
  assert.equal(
    (await call(space, ['init', '--cv', 'erika', '--json', NEW_CV, '--dry-run'])).exit,
    0,
  );
  assert.equal(existsSync(join(space.home, 'cvs', 'erika.json')), false);
  assert.equal((await call(space, ['init', '--cv', 'erika'], NEW_CV)).exit, 0);
  const contact = JSON.stringify({ value: { icon: 'mail', lines: ['erika@example.com'] } });
  assert.equal((await call(space, ['contact', 'add', '--cv', 'erika', '--json', contact])).exit, 0);
  const job = {
    id: 'acme',
    kind: 'job',
    section: 'Berufserfahrung',
    from: '01/2020',
    to: 'heute',
    title: 'Entwicklerin',
    place: 'Köln',
    employer: 'Acme GmbH',
    bullets: [],
  };
  assert.equal(
    (await call(space, ['block', 'add', '--cv', 'erika', '--json', JSON.stringify({ block: job })]))
      .exit,
    0,
  );
  const { answer } = await call(space, ['cvs']);
  assert.deepEqual(Array.isArray(answer.cvs) && answer.cvs.map(cv => cv.name), ['erika', 'jane']);
  assert.equal((await call(space, ['build', '--cv', 'erika', '--out', 'erika.docx'])).exit, 0);
});

test('a CV is chosen by --cv, by the profile, or as the only one', async () => {
  const space = workspace();
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  assert.deepEqual((await call(space, ['plan'])).codes, ['CV_REQUIRED']);
  assert.equal((await call(space, ['plan', '--cv', 'erika'])).exit, 0);
  assert.equal((await call(space, ['plan', '--profile', 'acme'])).exit, 0);
  assert.deepEqual((await call(space, ['plan', '--profile', 'acme', '--cv', 'erika'])).codes, [
    'CV_MISMATCH',
  ]);
  assert.deepEqual((await call(space, ['plan', '--cv', 'nobody'])).codes, ['UNKNOWN_CV']);
});

test('preview answers the pages as text', async () => {
  const { exit, answer } = await call(workspace(), ['preview', '--profile', 'acme']);
  assert.equal(exit, 0);
  assert.equal(typeof answer.preview === 'string' && answer.preview.includes('Page 2 of 2'), true);
});

test('build writes the .docx, and with --dry-run it writes nothing', async () => {
  const space = workspace();
  assert.equal((await call(space, ['build', '--out', 'out.docx', '--dry-run'])).exit, 0);
  assert.equal(existsSync(join(space.cwd, 'out.docx')), false);
  assert.equal((await call(space, ['build', '--out', 'out.docx'])).exit, 0);
  assert.equal(readFileSync(join(space.cwd, 'out.docx')).subarray(0, 2).toString(), 'PK');
  const terminal = await call(space, ['build', '--out', 'term.docx', '--style', 'terminal']);
  assert.deepEqual([terminal.exit, terminal.answer.style], [0, 'terminal']);
  assert.equal(readFileSync(join(space.cwd, 'term.docx')).subarray(0, 2).toString(), 'PK');
});

test('photo set stores the picture as a square PNG for a CV, or for one profile', async () => {
  const space = workspace();
  const source = tall(space.cwd);
  assert.equal((await call(space, ['photo', 'set', source, '--dry-run'])).exit, 0);
  assert.deepEqual(readFileSync(join(space.home, 'cvs', 'jane.png')), photo());
  assert.equal((await call(space, ['photo', 'set', source])).exit, 0);
  assert.equal(PNG.sync.read(readFileSync(join(space.home, 'cvs', 'jane.png'))).height, 10);
  assert.equal((await call(space, ['photo', 'set', source, '--profile', 'acme'])).exit, 0);
  assert.equal(PNG.sync.read(readFileSync(join(space.home, 'profiles', 'acme.png'))).width, 10);
  assert.equal(
    readFileSync(join(space.home, 'profiles', 'acme.json'), 'utf8').includes('profiles/acme.png'),
    true,
  );
  assert.equal((await call(space, ['build', '--profile', 'acme', '--out', 'acme.docx'])).exit, 0);
});

test('an edit command changes the CV file, and with --dry-run it does not', async () => {
  const space = workspace();
  const master = join(space.home, 'cvs', 'jane.json');
  const before = readFileSync(master, 'utf8');
  const input = JSON.stringify({ id: 'awards' });
  assert.equal((await call(space, ['block', 'remove', '--json', input, '--dry-run'])).exit, 0);
  assert.equal(readFileSync(master, 'utf8'), before);
  assert.equal((await call(space, ['block', 'remove'], input)).exit, 0);
  assert.equal(readFileSync(master, 'utf8').includes('"awards"'), false);
  assert.equal(
    (await call(space, ['cv', 'update', '--json', JSON.stringify({ language: 'de' })])).exit,
    0,
  );
  assert.equal(readFileSync(master, 'utf8').includes('"language": "de"'), true);
});

test('show lists the blocks, and one block in full by its id', async () => {
  const space = workspace();
  const all = await call(space, ['show']);
  assert.equal(Array.isArray(all.answer.blocks) && all.answer.blocks.length, 15);
  const one = await call(space, ['show', '--block', 'awards']);
  assert.equal(JSON.stringify(one.answer.block).includes('Team Award'), true);
  assert.deepEqual((await call(space, ['show', '--block', 'nobody'])).codes, ['UNKNOWN_BLOCK']);
});

test('schema answers the accepted input of a command', async () => {
  const { exit, answer } = await call(workspace(), ['schema', 'block move']);
  assert.equal(exit, 0);
  assert.equal(JSON.stringify(answer.input).includes('"after"'), true);
});

test('every packaged example CV and profile fits and builds', async () => {
  const space = { ...workspace(), home: fileURLToPath(new URL('../../examples', import.meta.url)) };
  const cvs = (await call(space, ['cvs'])).answer.cvs;
  const profiles = (await call(space, ['profiles'])).answer.profiles;
  const List = z.array(z.looseObject({ name: z.string(), fits: z.boolean() }));
  const listed = [...List.parse(cvs), ...List.parse(profiles)];
  assert.deepEqual(
    listed.filter(entry => entry.fits === false),
    [],
  );
  for (const { name } of List.parse(cvs)) {
    assert.equal(
      (await call(space, ['build', '--cv', name, '--out', `${name}.docx`])).exit,
      0,
      name,
    );
  }
  for (const { name } of List.parse(profiles)) {
    assert.equal(
      (await call(space, ['build', '--profile', name, '--out', `${name}.docx`])).exit,
      0,
      name,
    );
  }
});

test('refuses bad input with exit code 1 and the code of the reason', async () => {
  const space = workspace();
  writeFileSync(join(space.cwd, 'notes.txt'), 'not a picture');
  const { pages, ...withoutPages } = JSON.parse(readFileSync(FIXTURE_URL, 'utf8'));
  mkdirSync(join(space.cwd, 'broken-home', 'cvs'), { recursive: true });
  writeFileSync(join(space.cwd, 'broken-home', 'cvs', 'broken.json'), JSON.stringify(withoutPages));
  const cases: [string[], string][] = [
    [['build', '--out', '../out.docx'], 'PATH_OUTSIDE'],
    [['build', '--out', 'out.txt'], 'WRONG_EXTENSION'],
    [['build'], 'MISSING_OPTION'],
    [['build', '--out', 'out.docx', '--style', 'neon'], 'UNKNOWN_STYLE'],
    [['block', 'remove', '--json', '{broken'], 'INVALID_JSON'],
    [['block', 'remove'], 'MISSING_INPUT'],
    [['paint'], 'UNKNOWN_COMMAND'],
    [['plan', '--color'], 'UNKNOWN_OPTION'],
    [['preview', '--output', 'pdf'], 'UNKNOWN_OUTPUT'],
    [['plan', '--home', 'missing'], 'NO_CV'],
    [['profiles', '--home', 'missing'], 'NO_CV'],
    [['plan', '--home', 'broken-home'], 'SCHEMA'],
    [['plan', '--profile', 'nobody'], 'UNKNOWN_PROFILE'],
    [['plan', '--profile', '../cv'], 'UNKNOWN_PROFILE'],
    [['init', '--json', NEW_CV], 'MISSING_OPTION'],
    [['init', '--cv', '../evil', '--json', NEW_CV], 'SCHEMA'],
    [['init', '--cv', 'jane', '--json', NEW_CV], 'CV_EXISTS'],
    [['init', '--cv', 'erika', '--json', '{"language":"german"}'], 'SCHEMA'],
    [['photo', 'set'], 'MISSING_INPUT'],
    [['photo', 'set', 'missing.png'], 'FILE_NOT_FOUND'],
    [['photo', 'set', 'notes.txt'], 'PHOTO_UNREADABLE'],
    [['photo', 'set', 'notes.txt', '--profile', 'nobody'], 'UNKNOWN_PROFILE'],
  ];
  for (const [argv, code] of cases) {
    const { exit, codes } = await call(space, argv);
    assert.deepEqual([exit, codes.slice(0, 1)], [1, [code]], argv.join(' '));
  }
});

test('an option without a value answers the values it accepts', async () => {
  const space = workspace();
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  const values = async (argv: string[]) => (await call(space, argv)).answer;
  assert.deepEqual(await values(['show', '--cv']), {
    ok: true,
    option: 'cv',
    values: ['erika', 'jane'],
  });
  assert.deepEqual(await values(['plan', '--profile']), {
    ok: true,
    option: 'profile',
    values: ['acme', 'broken'],
  });
  assert.deepEqual(await values(['build', '--style']), {
    ok: true,
    option: 'style',
    values: ['classic', 'terminal'],
  });
  assert.deepEqual(await values(['preview', '--output']), {
    ok: true,
    option: 'output',
    values: ['json', 'text'],
  });
  const blocks = await values(['show', '--cv', 'jane', '--block']);
  assert.deepEqual(
    [blocks.option, blocks.cv, Array.isArray(blocks.values) && blocks.values.length],
    ['block', 'jane', 15],
  );
  assert.equal((await values(['show', '--profile', 'acme', '--block'])).cv, 'jane');
});

// A free value, such as a path or a JSON input, has no list; the refusal names the option.
test('an option without a value and without a list is refused by its name', async () => {
  const space = workspace();
  const cases: [string[], string][] = [
    [['build', '--out'], 'out'],
    [['plan', '--home'], 'home'],
    [['block', 'add', '--json'], 'json'],
  ];
  for (const [argv, path] of cases) {
    const { exit, answer } = await call(space, argv);
    assert.deepEqual(
      [exit, answer.issues?.map(issue => [issue.code, issue.path])],
      [1, [['MISSING_VALUE', path]]],
      argv.join(' '),
    );
  }
});

// The command of a refusal answers the values that fix it, so the agent runs it and picks one.
test('a refusal names a command that lists the fitting values, and that command runs', async () => {
  const space = workspace();
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  const cases: [string[], string, string][] = [
    [['plan'], 'CV_REQUIRED', 'oriko show --cv'],
    [['plan', '--cv', 'nobody'], 'UNKNOWN_CV', 'oriko show --cv'],
    [['plan', '--profile', 'nobody'], 'UNKNOWN_PROFILE', 'oriko plan --profile'],
    [
      ['show', '--cv', 'jane', '--block', 'nobody'],
      'UNKNOWN_BLOCK',
      'oriko show --cv jane --block',
    ],
    [['block', 'remove', '--cv', 'jane'], 'MISSING_INPUT', 'oriko schema block remove'],
    [['block', 'add', '--cv', 'jane', '--json'], 'MISSING_VALUE', 'oriko schema block add'],
    [['paint'], 'UNKNOWN_COMMAND', 'oriko schema'],
    [['plan', '--color'], 'UNKNOWN_OPTION', 'oriko schema'],
  ];
  for (const [argv, code, command] of cases) {
    const [issue] = (await call(space, argv)).answer.issues ?? [];
    assert.deepEqual([issue?.code, issue?.command], [code, command], argv.join(' '));
    const listed = await call(space, command.split(' ').slice(1));
    assert.equal(listed.answer.ok, true, command);
  }
});

// The command keeps the --home of the call, or it would list the CVs of another data folder.
test('the command of a refusal keeps the data folder of the call', async () => {
  const space = workspace();
  const [issue] =
    (await call(space, ['plan', '--cv', 'nobody', '--home', space.home])).answer.issues ?? [];
  assert.equal(issue?.command, `oriko show --cv --home ${space.home}`);
});

test('names the unknown option in the path of the refusal', async () => {
  const [issue] = (await call(workspace(), ['plan', '--color'])).answer.issues ?? [];
  assert.equal(issue?.path, 'color');
});

test('refuses a photo path that leaves the data folder', async () => {
  const space = workspace();
  const path = join(space.home, 'cvs', 'jane.json');
  writeFileSync(path, readFileSync(path, 'utf8').replace('"cvs/jane.png"', '"../photo.png"'));
  const { exit, codes } = await call(space, ['build', '--out', 'out.docx']);
  assert.deepEqual([exit, codes], [1, ['PATH_OUTSIDE']]);
});
