import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { z } from 'zod';
import { NEW_CV, call, workspace } from '../utils/cli.ts';
import type { Space } from '../utils/cli.ts';
import { docx, pdf } from '../utils/documents.ts';
import { fakeWeb } from '../utils/web.ts';
import { FIXTURE_URL, photo } from '../utils/fixture.ts';

const tall = (cwd: string) => {
  const path = join(cwd, 'tall.png');
  writeFileSync(path, PNG.sync.write(new PNG({ width: 10, height: 30 })));
  return path;
};

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
  for (const [name, photo] of [
    ['nul', 'cvs/x\u0000.png'],
    ['split', 'cvs/a\nb.png'],
    ['absolute', join(space.home, 'cvs', 'jane.png')],
  ])
    writeFileSync(
      join(space.home, 'profiles', `${name}.json`),
      JSON.stringify({ cv: 'jane', person: { photo } }),
    );
  const cases: [string[], string][] = [
    [['plan', '--profile', 'nul'], 'SCHEMA'],
    [['plan', '--profile', 'split'], 'SCHEMA'],
    [['plan', '--profile', 'absolute'], 'SCHEMA'],
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
  // An empty --home opens no folder, not even the default one.
  const file = join(space.cwd, 'not-a-folder');
  writeFileSync(file, '');
  const { answer } = await call({ ...space, home: file }, ['plan', '--home']);
  assert.deepEqual(
    answer.issues?.map(issue => issue.code),
    ['MISSING_VALUE'],
  );
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
  // The command keeps the --home of the call, or it would list the CVs of another data folder.
  for (const [argv, code, command] of cases) {
    const home = ` --home ${space.home}`;
    const [issue] = (await call(space, [...argv, '--home', space.home])).answer.issues ?? [];
    assert.deepEqual([issue?.code, issue?.command], [code, `${command}${home}`], argv.join(' '));
    const listed = await call(space, `${command}${home}`.split(' ').slice(1));
    assert.equal(listed.answer.ok, true, command);
  }
});

test('schema answers every command and every shape it lists', async () => {
  const space = workspace();
  const { commands, schemas } = (await call(space, ['schema'])).answer;
  const names = [...z.array(z.string()).parse(commands), ...z.array(z.string()).parse(schemas)];
  for (const name of names)
    assert.equal((await call(space, ['schema', ...name.split(' ')])).answer.ok, true, name);
  const plan = (await call(space, ['schema', 'plan'])).answer;
  assert.deepEqual(
    [plan.name, plan.input, Object.keys(z.record(z.string(), z.unknown()).parse(plan.options))],
    ['plan', null, ['cv', 'profile', 'home', 'output']],
  );
});

// A wrong input names the schema that shows the accepted shape, and that schema exists.
test('a refusal for a wrong shape names the schema command, and it runs', async () => {
  const space = workspace();
  const cases: [string[], string][] = [
    [['block', 'add', '--json', '{}'], 'oriko schema block add'],
    [['item', 'add', '--json', '{"block":"awards","value":5}'], 'oriko schema item'],
    [['contact', 'add', '--json', '{"value":5}'], 'oriko schema contact'],
    [['init', '--cv', 'erika', '--json', '{}'], 'oriko schema init'],
  ];
  for (const [argv, command] of cases) {
    const [issue] = (await call(space, argv)).answer.issues ?? [];
    assert.deepEqual([issue?.code, issue?.command], ['SCHEMA', command], argv.join(' '));
    assert.equal((await call(space, command.split(' ').slice(1))).answer.ok, true, command);
  }
});

// Nothing a command does not take passes silently, and one answer names every mistake.
test('checks the call against its command and names every mistake at once', async () => {
  const space = workspace();
  const cases: [string[], [string, string][]][] = [
    [
      ['init'],
      [
        ['MISSING_OPTION', 'cv'],
        ['MISSING_INPUT', 'json'],
      ],
    ],
    [['cvs', 'extra'], [['UNEXPECTED_ARGUMENT', 'extra']]],
    [['photo', 'set', 'a.png', 'b.png'], [['UNEXPECTED_ARGUMENT', 'b.png']]],
    [['plan', '--out', 'x.docx'], [['OPTION_NOT_ALLOWED', 'out']]],
    [['plan', '--cv', 'jane', '--cv', 'jane'], [['REPEATED_OPTION', 'cv']]],
    [['build', '--out', 'x.docx', '--dry-run=true'], [['UNEXPECTED_VALUE', 'dry-run']]],
    [
      ['plan', '--color', '--size'],
      [
        ['UNKNOWN_OPTION', 'color'],
        ['UNKNOWN_OPTION', 'size'],
      ],
    ],
    [['init', '--cv'], [['MISSING_VALUE', 'cv']]],
    [
      ['show', '--cv', '--profile'],
      [
        ['MISSING_VALUE', 'cv'],
        ['MISSING_VALUE', 'profile'],
      ],
    ],
    [
      ['init', '--cv', 'erika', '--json', NEW_CV, '--home', '--dry-run'],
      [['MISSING_VALUE', 'home']],
    ],
    [['bogus', '--cv='], [['UNKNOWN_COMMAND', 'command']]],
    [['photo set', 'a.png'], [['UNKNOWN_COMMAND', 'command']]],
    [['block', '--json', '{}'], [['OPTION_NOT_ALLOWED', 'json']]],
    [['block', '--bogus'], [['UNKNOWN_OPTION', 'bogus']]],
    [['--profile'], [['OPTION_NOT_ALLOWED', 'profile']]],
    [['photo', 'set'], [['MISSING_INPUT', 'file']]],
    [['photo', 'set', 'missing.png'], [['FILE_NOT_FOUND', 'file']]],
  ];
  for (const [argv, expected] of cases) {
    const { exit, answer } = await call(space, argv);
    assert.deepEqual(
      [exit, answer.issues?.map(issue => [issue.code, issue.path])],
      [1, expected],
      argv.join(' '),
    );
  }
  const notAllowed = (await call(space, ['plan', '--out', 'x.docx'])).answer.issues?.[0];
  assert.equal(notAllowed?.command, 'oriko schema plan');
  const newName = (await call(space, ['init', '--cv'])).answer.issues?.[0];
  assert.equal(newName?.command, 'oriko show --cv');
});

test('names the same next step for --out, whether it is missing or empty', async () => {
  const space = workspace();
  const hint = async (argv: string[]) =>
    z.looseObject({ hint: z.string() }).parse((await call(space, argv)).answer.issues?.[0]).hint;
  assert.equal(await hint(['build']), await hint(['build', '--out']));
});

test('oriko alone answers where to start: the CVs and the profiles of the data folder', async () => {
  const space = workspace();
  assert.deepEqual(
    [(await call(space, [])).answer.cvs, (await call(space, [])).answer.profiles],
    [['jane'], ['acme', 'broken']],
  );
  const empty = mkdtempSync(join(tmpdir(), 'oriko-empty-'));
  const start = (await call(space, ['--home', empty])).answer;
  assert.deepEqual([start.ok, start.cvs, start.profiles], [true, [], []]);
});

test('a group of commands without its action lists the actions', async () => {
  const space = workspace();
  const cases: [string, string[]][] = [
    ['block', ['block add', 'block update', 'block remove', 'block move']],
    ['item', ['item add', 'item update', 'item remove', 'item move']],
    ['contact', ['contact add', 'contact update', 'contact remove', 'contact move']],
    ['cv', ['cv update']],
    ['photo', ['photo set']],
  ];
  for (const [group, actions] of cases)
    assert.deepEqual((await call(space, [group])).answer, {
      ok: true,
      command: group,
      values: actions,
    });
  const [issue] = (await call(space, ['block', 'frobnicate'])).answer.issues ?? [];
  assert.deepEqual([issue?.code, issue?.command], ['UNKNOWN_COMMAND', 'oriko block']);
});

// A wrong folder or file is the caller's to fix, so it is refused with exit 1, never a bug.
test('refuses a folder where a file belongs, and a file where a folder belongs', async () => {
  const space = workspace();
  writeFileSync(join(space.cwd, 'notes.txt'), 'not a folder');
  writeFileSync(join(space.home, 'profiles', 'ghost.json'), JSON.stringify({ cv: 'ghost' }));
  writeFileSync(join(space.cwd, 'huge.png'), Buffer.alloc(20_000_001));
  writeFileSync(join(space.cwd, 'locked.png'), 'no one may read this', { mode: 0o000 });
  mkdirSync(join(space.cwd, 'flat'));
  writeFileSync(join(space.cwd, 'flat', 'cvs'), 'a file where the folder of CVs belongs');
  mkdirSync(join(space.cwd, 'nested', 'cvs', 'jane.json'), { recursive: true });
  mkdirSync(join(space.cwd, 'd.docx'));
  mkdirSync(join(space.cwd, 'sealed'), { mode: 0o555 });
  mkdirSync(join(space.cwd, 'sealed-home'), { mode: 0o555 });
  execFileSync('mkfifo', [join(space.cwd, 'pipe.png')]);
  mkdirSync(join(space.cwd, 'piped', 'cvs'), { recursive: true });
  execFileSync('mkfifo', [join(space.cwd, 'piped', 'cvs', 'pipe.json')]);
  execFileSync('mkfifo', [join(space.home, 'cvs', 'pipe.png')]);
  const piped = { cv: 'jane', person: { photo: 'cvs/pipe.png' } };
  writeFileSync(join(space.home, 'profiles', 'piped.json'), JSON.stringify(piped));
  const cases: [string[], string, string][] = [
    [['plan', '--home', 'notes.txt'], 'NOT_A_FOLDER', 'home'],
    [['plan', '--home', 'notes.txt/x'], 'PATH_REFUSED', 'home'],
    [['cvs', '--home', 'flat'], 'PATH_REFUSED', 'home'],
    [['plan', '--home', 'nested'], 'NOT_A_FILE', 'cv'],
    [['photo', 'set', '.'], 'NOT_A_FILE', 'file'],
    [['photo', 'set', 'huge.png'], 'INPUT_TOO_LARGE', 'file'],
    [['photo', 'set', 'pipe.png'], 'NOT_A_FILE', 'file'],
    [['plan', '--home', 'piped'], 'NOT_A_FILE', 'cv'],
    [['build', '--profile', 'piped', '--out', 'p.docx', '--dry-run'], 'NOT_A_FILE', 'person.photo'],
    [['photo', 'set', 'locked.png'], 'PATH_REFUSED', 'file'],
    [['photo', 'set', 'notes.txt/x.png'], 'PATH_REFUSED', 'file'],
    [['photo', 'set', `${'a'.repeat(300)}.png`], 'PATH_REFUSED', 'file'],
    [['plan', '--profile', 'acme', '--home', 'nowhere'], 'NO_CV', 'home'],
    [['plan', '--profile', 'ghost'], 'UNKNOWN_CV', 'profile.cv'],
    [['build', '--out', 'sub/x.docx'], 'FOLDER_NOT_FOUND', 'out'],
    [['build', '--out', 'notes.txt/x.docx', '--dry-run'], 'NOT_A_FOLDER', 'out'],
    [['build', '--out', 'd.docx', '--dry-run'], 'NOT_A_FILE', 'out'],
    [['build', '--out', 'sealed/x.docx'], 'PATH_REFUSED', 'out'],
    [['init', '--cv', 'erika', '--json', NEW_CV, '--home', 'sealed-home'], 'PATH_REFUSED', 'home'],
  ];
  for (const [argv, code, path] of cases) {
    const { exit, answer } = await call(space, argv);
    const [issue] = answer.issues ?? [];
    assert.deepEqual([exit, issue?.code, issue?.path], [1, code, path], argv.join(' '));
  }
  assert.deepEqual(readdirSync(join(space.cwd, 'sealed')), []);
  // The check reads --out as the write does: a link there is replaced, never followed, and the
  // working directory is the same folder by any path that leads to it.
  symlinkSync(join(space.cwd, 'd.docx'), join(space.cwd, 'dirlink.docx'));
  symlinkSync('loop.docx', join(space.cwd, 'loop.docx'));
  for (const out of ['dirlink.docx', 'loop.docx', join(realpathSync(space.cwd), 'real.docx')])
    assert.equal((await call(space, ['build', '--out', out, '--dry-run'])).exit, 0, out);
  // The write goes to the folder the check resolved, and the answer names that folder.
  mkdirSync(join(space.cwd, 'reports'));
  symlinkSync(join(space.cwd, 'reports'), join(space.cwd, 'latest'));
  const built = (await call(space, ['build', '--out', 'latest/cv.docx'])).answer;
  assert.deepEqual(
    [built.out, existsSync(join(space.cwd, 'reports', 'cv.docx'))],
    ['reports/cv.docx', true],
  );
  chmodSync(join(space.home, 'cvs'), 0o555);
  const edit = await call(space, ['block', 'remove', '--json', JSON.stringify({ id: 'awards' })]);
  assert.deepEqual([edit.exit, edit.codes], [1, ['PATH_REFUSED']]);
});

test('a profile decides the CV for show and for the list of CVs', async () => {
  const space = workspace();
  await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  assert.equal((await call(space, ['show', '--profile', 'acme'])).answer.cv, 'jane');
  assert.deepEqual((await call(space, ['plan', '--profile', 'acme', '--cv'])).answer.values, [
    'jane',
  ]);
});

test('names the unknown option in the path of the refusal', async () => {
  const [issue] = (await call(workspace(), ['plan', '--color'])).answer.issues ?? [];
  assert.equal(issue?.path, 'color');
});

// The shape of the path is refused where the data enters; a link out of the folder where it opens.
test('refuses a photo path that leaves the data folder', async () => {
  const space = workspace();
  const path = join(space.home, 'cvs', 'jane.json');
  const master = readFileSync(path, 'utf8');
  writeFileSync(path, master.replace('"cvs/jane.png"', '"cvs/../../photo.png"'));
  const shape = await call(space, ['build', '--out', 'out.docx']);
  assert.deepEqual([shape.exit, shape.codes], [1, ['SCHEMA']]);
  writeFileSync(join(space.cwd, 'outside.png'), photo());
  symlinkSync(join(space.cwd, 'outside.png'), join(space.home, 'cvs', 'linked.png'));
  writeFileSync(path, master.replace('"cvs/jane.png"', '"cvs/linked.png"'));
  const linked = await call(space, ['build', '--out', 'out.docx']);
  assert.deepEqual([linked.exit, linked.codes], [1, ['PATH_OUTSIDE']]);
});

// A link in the data folder never redirects a write: the write replaces the link, not its target.
test('writes never follow a link out of the data folder', async () => {
  const space = workspace();
  const victim = join(space.cwd, 'victim.txt');
  writeFileSync(victim, 'untouched');
  symlinkSync(victim, join(space.home, 'cvs', 'erika.png'));
  symlinkSync(victim, join(space.home, 'cvs', `jane.json.${process.pid}.tmp`));
  assert.equal((await call(space, ['init', '--cv', 'erika', '--json', NEW_CV])).exit, 0);
  const input = JSON.stringify({ id: 'awards' });
  assert.equal((await call(space, ['block', 'remove', '--cv', 'jane', '--json', input])).exit, 0);
  assert.equal(readFileSync(victim, 'utf8'), 'untouched');
});

// A command that writes several files writes all of them or none: here the CV file cannot be
// written, so its photo is not left behind either.
test('a refused write leaves none of the files of the command', async () => {
  const space = workspace();
  mkdirSync(join(space.home, 'cvs', `erika.json.${process.pid}.tmp`, 'blocker'), {
    recursive: true,
  });
  const { exit } = await call(space, ['init', '--cv', 'erika', '--json', NEW_CV]);
  assert.deepEqual([exit, existsSync(join(space.home, 'cvs', 'erika.png'))], [1, false]);
});

const PAGE = '<!doctype html><html><body><h1>Senior Go Engineer</h1><p>Berlin</p></body></html>';

const reading = () => {
  const space = workspace();
  const { web } = fakeWeb(
    { 'jobs.example': ['93.184.216.34'] },
    { 'https://jobs.example/1': { status: 200, body: PAGE } },
  );
  return { ...space, web };
};

const stored = (space: Space, ...path: string[]) => {
  const file = join(space.home, ...path);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
};

test('read stores a posting from a file or an https address beside its profile', async () => {
  const space = reading();
  writeFileSync(join(space.cwd, 'job.pdf'), pdf('Senior Go Engineer'));
  const fromFile = await call(space, ['read', '--profile', 'acme', '--posting', 'job.pdf']);
  assert.deepEqual(
    [fromFile.exit, fromFile.answer.read],
    [
      0,
      [
        {
          role: 'posting',
          source: 'job.pdf',
          kind: 'pdf',
          chars: 18,
          replaced: 0,
          stored: 'profiles/acme.posting.md',
          text: 'Senior Go Engineer',
        },
      ],
    ],
  );
  assert.equal(
    stored(space, 'profiles', 'acme.posting.md'),
    '---\nsource: "job.pdf"\nkind: pdf\n---\n\nSenior Go Engineer\n',
  );
  const link = 'https://jobs.example/1';
  const fromWeb = await call(space, ['read', '--profile', 'globex', '--posting', link]);
  assert.deepEqual(
    [fromWeb.exit, stored(space, 'profiles', 'globex.posting.md')],
    [0, `---\nsource: "${link}"\nkind: html\n---\n\n# Senior Go Engineer\n\nBerlin\n`],
  );
});

test('read appends notes beside the CV, and answers an old CV without storing it', async () => {
  const space = reading();
  writeFileSync(join(space.cwd, 'a.md'), 'Led the move to Go');
  writeFileSync(join(space.cwd, 'b.txt'), 'Mentored four engineers');
  writeFileSync(join(space.cwd, 'old.docx'), await docx(['Jane Doe', 'Engineer']));
  assert.equal((await call(space, ['read', '--notes', 'a.md', '--notes', 'b.txt'])).exit, 0);
  assert.equal((await call(space, ['read', '--notes', 'a.md'])).exit, 0);
  assert.equal(
    stored(space, 'cvs', 'jane.notes.md'),
    '## a.md\n\nLed the move to Go\n\n## b.txt\n\nMentored four engineers\n\n## a.md\n\nLed the move to Go\n',
  );
  const before = [readdirSync(join(space.home, 'cvs')), readdirSync(join(space.home, 'profiles'))];
  const resume = await call(space, ['read', '--resume', 'old.docx']);
  assert.deepEqual(resume.answer.read, [
    {
      role: 'resume',
      source: 'old.docx',
      kind: 'docx',
      chars: 17,
      replaced: 0,
      text: 'Jane Doe\nEngineer',
    },
  ]);
  assert.deepEqual(
    [readdirSync(join(space.home, 'cvs')), readdirSync(join(space.home, 'profiles'))],
    before,
  );
});

// One answer names every issue of every input, and a refused call stores nothing at all.
test('read refuses with every issue of every input, and then stores nothing', async () => {
  const space = reading();
  writeFileSync(join(space.cwd, 'job.pdf'), pdf('Senior Go Engineer'));
  writeFileSync(join(space.cwd, 'scan.pdf'), pdf());
  writeFileSync(join(space.cwd, 'image.png'), photo());
  writeFileSync(join(space.cwd, 'a.md'), 'Led the move to Go');
  mkdirSync(join(space.cwd, 'empty'));
  const cases: [string[], string[]][] = [
    [['read'], ['MISSING_INPUT']],
    [['read', '--posting', 'job.pdf'], ['MISSING_OPTION']],
    [['read', '--profile', '../acme', '--posting', 'job.pdf'], ['SCHEMA']],
    [
      [
        'read',
        '--profile',
        'acme',
        '--posting',
        'scan.pdf',
        '--notes',
        'a.md',
        '--notes',
        'image.png',
      ],
      ['NO_TEXT', 'UNSUPPORTED_KIND'],
    ],
    [['read', '--profile', 'acme', '--posting', 'http://jobs.example/1'], ['URL_NOT_ALLOWED']],
    [['read', '--profile', 'acme', '--posting', 'missing.pdf'], ['FILE_NOT_FOUND']],
    [['read', '--notes', 'a.md', '--home', 'empty'], ['NO_CV']],
  ];
  for (const [argv, expected] of cases) {
    const { exit, codes } = await call(space, argv);
    assert.deepEqual([exit, codes], [1, expected], argv.join(' '));
  }
  assert.deepEqual(
    [stored(space, 'profiles', 'acme.posting.md'), stored(space, 'cvs', 'jane.notes.md')],
    [null, null],
  );
  const [missing] = (await call(space, ['read'])).answer.issues ?? [];
  assert.equal(missing?.command, 'oriko schema read');
});

// A posting is replaced only on request; the same text again is no change, and a dry run writes nothing.
test('read keeps a stored posting unless --replace is given', async () => {
  const space = reading();
  writeFileSync(join(space.cwd, 'job.pdf'), pdf('Senior Go Engineer'));
  writeFileSync(join(space.cwd, 'new.txt'), 'Staff Go Engineer');
  const posting = ['read', '--profile', 'acme', '--posting'];
  assert.equal((await call(space, [...posting, 'job.pdf'])).exit, 0);
  assert.equal((await call(space, [...posting, 'job.pdf'])).exit, 0);
  assert.deepEqual((await call(space, [...posting, 'new.txt'])).codes, ['POSTING_EXISTS']);
  assert.equal((await call(space, [...posting, 'new.txt', '--replace', '--dry-run'])).exit, 0);
  assert.match(stored(space, 'profiles', 'acme.posting.md') ?? '', /Senior Go Engineer/);
  assert.equal((await call(space, [...posting, 'new.txt', '--replace'])).exit, 0);
  assert.match(stored(space, 'profiles', 'acme.posting.md') ?? '', /Staff Go Engineer/);
});
