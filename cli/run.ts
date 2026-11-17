/**
 * The cli: one JSON answer per call on stdout, and an exit code that says who acts next.
 *
 * run: runs one command and answers its exit code.
 * Io: what the cli needs from its surroundings, so a test can stand in for the terminal.
 *
 * Exit 0 is success, 1 a refusal the caller fixes, 2 a bug in this program. stdout carries the
 * whole answer; nothing a caller needs goes to stderr.
 *
 * @example process.exitCode = await run(process.argv.slice(2), io);
 */
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { $try, causeText, refusal, shown, trySync$ } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { Rejection, done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import { COLUMN, EXIT, ICONS, KINDS, LIMITS, STYLES } from '../core/limits.ts';
import { check, schemaIssues, unknownBlock } from '../data/check.ts';
import { Block, Master, NewCv, Profile } from '../data/cv.schema.ts';
import { COMMANDS, apply } from '../edit/apply.ts';
import { INPUT } from '../edit/edit.schema.ts';
import { place } from '../layout/place.ts';
import type { Plan } from '../layout/place.ts';
import { render } from '../render/docx.ts';
import { renderTerminal } from '../render/terminal.ts';
import { preview } from '../preview/text.ts';
import {
  invalidJson,
  missingOption,
  outputPath,
  photoBytes,
  readJson,
  tooLarge,
  writeAtomic,
} from './files.ts';
import { chosenCv, cvNames, profileNames, profilePath } from './home.ts';
import { createCv } from './init.ts';
import { setPhoto } from './photo.ts';

export type Io = {
  /** The data folder: every CV in cvs/ and every profile in profiles/. */
  home: string;
  cwd: string;
  isTTY: boolean;
  /** The text piped in, or null when nothing is piped. */
  stdin: () => Promise<string | null>;
  write: (text: string) => void;
};

type Fields = Record<string, unknown>;
type Call = { io: Io; home: string; values: ReturnType<typeof parsed>['values']; words: string[] };

const SCHEMAS = { master: Master, profile: Profile, block: Block, init: NewCv, ...INPUT };
const OTHER_COMMANDS = [
  'schema',
  'cvs',
  'init',
  'show',
  'profiles',
  'plan',
  'preview',
  'build',
  'photo set',
];
const OPTIONS = {
  home: 'the data folder with cvs/NAME.json and profiles/NAME.json; ~/.oriko when left out',
  cv: 'the name of one CV; needed only when the data folder holds several and no profile names one',
  profile: 'the name of one profile; it names its CV in its field cv',
  out: 'the .docx to write, for build; a path inside the working directory',
  json: 'the input of an edit command; without it the input comes from stdin',
  block: 'the id of one block to show in full, for show',
  'dry-run': 'check and answer, but write no file',
  style:
    'the look of the .docx, for build: classic, or terminal like the preview; classic when left out',
  output: 'json or text; json when stdout is no terminal',
};

/**
 * @param argv - the arguments after the program name
 * @param io - the surroundings of the call
 * @returns the exit code
 */
export async function run(argv: string[], io: Io) {
  const { data, error } = await $try(() => answered(argv, io));
  if (error !== null) return crashed(error, io);
  io.write(data.asText ? text(data.result) : json(data.result));
  return data.result.error === null ? EXIT.ok : EXIT.expected;
}

// The one place an unexpected error ends: a bug of this program, never the caller's to fix.
function crashed(error: Error, io: Io) {
  const bug = {
    ok: false,
    kind: 'bug',
    step: 'oriko',
    reason: 'an unexpected error stopped the command',
    next: 'stop and tell the person; the maintainer of oriko fixes it',
    state: 'A file may be half written only if the error came from the disk.',
    issues: [],
    cause: causeText(error),
  };
  io.write(`${JSON.stringify(bug)}\n`);
  return EXIT.fatal;
}

const json = (result: Result<Fields>) =>
  `${JSON.stringify(result.error === null ? { ok: true, ...result.data } : refused(result.error))}\n`;

function refused(error: Rejection) {
  const { kind, step, reason, next, state } = error.refusal;
  return { ok: false, kind, step, reason, next, state, issues: error.issues };
}

function text(result: Result<Fields>) {
  if (result.error === null)
    return typeof result.data.preview === 'string'
      ? result.data.preview
      : `${JSON.stringify(result.data, null, 2)}\n`;
  const issues = result.error.issues.map(
    issue =>
      `- ${issue.code} at ${shown(issue.path)}: ${shown(issue.message)}. ${issue.hint}.` +
      (issue.command === undefined ? '' : ` Command: ${issue.command}`),
  );
  return `${[refusal(result.error.refusal), ...issues].join('\n')}\n`;
}

const ARGS = {
  home: { type: 'string' },
  cv: { type: 'string' },
  profile: { type: 'string' },
  out: { type: 'string' },
  json: { type: 'string' },
  block: { type: 'string' },
  output: { type: 'string' },
  'dry-run': { type: 'boolean' },
  style: { type: 'string' },
} as const;
const VALUED = Object.entries(ARGS)
  .filter(([, spec]) => spec.type === 'string')
  .map(([name]) => name);
const OUTPUTS = ['json', 'text'] as const;
/** The options whose values a list holds; every other option takes a free value, such as a path. */
const LISTED = ['cv', 'profile', 'block', 'style', 'output'];
/** What a free value is, for an option given without one. */
const FREE_VALUES: Record<string, string> = {
  home: 'Add the data folder that holds cvs/ and profiles/, or leave out --home for ~/.oriko',
  out: 'Add the path of the .docx file to write, inside the working directory',
  json: 'Run the command for the input shape, then pass it as one JSON object',
};

function parsed(argv: string[]) {
  return parseArgs({ args: argv, allowPositionals: true, strict: true, options: ARGS });
}

async function answered(argv: string[], io: Io) {
  const { rest, empty } = withoutEmptyOptions(argv);
  const args = trySync$(() => parsed(rest));
  if (args.error !== null)
    return { result: rejected('oriko', [unknownOption(args.error)], args.error), asText: io.isTTY };
  const { values, positionals } = args.data;
  const isKnownOutput =
    values.output === undefined || OUTPUTS.some(output => output === values.output);
  if (isKnownOutput === false)
    return { result: rejected('oriko', [unknownOutput(values.output ?? '')]), asText: io.isTTY };
  const asText = values.output === undefined ? io.isTTY : values.output === 'text';
  const home = values.home === undefined ? io.home : resolve(io.cwd, values.home);
  const call = { io, home, values, words: positionals };
  const result = empty.length === 0 ? await dispatched(call) : await emptied(call, empty);
  return { result: await withCommands(call, result), asText };
}

// An option that takes a value but has none: last, before the next option, or written as --name=.
function withoutEmptyOptions(argv: string[]) {
  const rest: string[] = [];
  const empty: string[] = [];
  for (const [index, arg] of argv.entries()) {
    const name = VALUED.find(option => arg === `--${option}` || arg === `--${option}=`);
    const next = argv[index + 1];
    const hasValue =
      arg.endsWith('=') === false && next !== undefined && next.startsWith('--') === false;
    if (name === undefined || hasValue) rest.push(arg);
    else empty.push(name);
  }
  return { rest, empty };
}

const unknownOption = (error: Error): Issue => ({
  code: 'UNKNOWN_OPTION',
  path: /'--?([^'\s=]+)/.exec(error.message)?.[1] ?? '',
  message: 'The arguments name an option or a value this program does not know',
  hint: 'Run the command and use one of the options it lists',
  command: 'oriko schema',
});

const unknownOutput = (output: string): Issue => ({
  code: 'UNKNOWN_OUTPUT',
  path: 'output',
  message: `No output is called ${shown(output)}`,
  hint: `Use one of: ${OUTPUTS.join(', ')}`,
});

// Options without a value: a list answers its values; a free value is refused by its name.
async function emptied(call: Call, empty: string[]): Promise<Result<Fields>> {
  const free = empty.filter(option => LISTED.includes(option) === false);
  if (free.length > 0)
    return rejected(
      'oriko',
      free.map(option => missingValue(option, call.words)),
    );
  const [option = ''] = empty;
  return valuesOf(call, option);
}

async function valuesOf(call: Call, option: string): Promise<Result<Fields>> {
  switch (option) {
    case 'cv':
      return done({ option, values: await cvNames(call.home) });
    case 'profile':
      return done({ option, values: await profileNames(call.home) });
    case 'style':
      return done({ option, values: [...STYLES] });
    case 'output':
      return done({ option, values: [...OUTPUTS] });
    default:
      return blockValues(call);
  }
}

// The blocks of the CV this call names, in the outline show answers, so a caller picks an id.
async function blockValues(call: Call): Promise<Result<Fields>> {
  const cv = await chosenCv(call.home, call.values.cv, await profileCv(call));
  if (cv.error !== null) return cv;
  const master = await masterOf(cv.data.path, 'show');
  if (master.error !== null) return master;
  return done({ option: 'block', cv: cv.data.name, values: master.data.blocks.map(outline) });
}

function missingValue(option: string, words: string[]): Issue {
  const issue = {
    code: 'MISSING_VALUE',
    path: option,
    message: `The option --${option} has no value`,
    hint: FREE_VALUES[option] ?? `Add a value to --${option}`,
  };
  return option === 'json' ? { ...issue, command: schemaCommand(words.join(' ')) } : issue;
}

const schemaCommand = (command: string) =>
  isSchemaName(command) ? `oriko schema ${command}` : 'oriko schema';

/**
 * Completes the commands of a refusal, so each one runs as it stands.
 *
 * @param call - the call that was refused
 * @param result - its answer
 * @returns the answer, an unknown block given the command for the ids of this call's CV, and every
 *   command given the --home of this call
 */
async function withCommands(call: Call, result: Result<Fields>): Promise<Result<Fields>> {
  if (result.error === null) return result;
  const blockCommand = await blockListCommand(call, result.error.issues);
  const home = call.values.home === undefined ? '' : ` --home ${shellWord(call.values.home)}`;
  const issues = result.error.issues.map(issue => {
    const command =
      issue.code === 'UNKNOWN_BLOCK' ? (issue.command ?? blockCommand) : issue.command;
    return command === undefined ? issue : { ...issue, command: `${command}${home}` };
  });
  return { data: null, error: new Rejection(result.error.refusal, issues) };
}

async function blockListCommand(call: Call, issues: Issue[]) {
  if (issues.some(issue => issue.code === 'UNKNOWN_BLOCK') === false) return undefined;
  const cv = await chosenCv(call.home, call.values.cv, await profileCv(call));
  return cv.error === null ? `oriko show --cv ${cv.data.name} --block` : undefined;
}

// A word the shell passes on as it is: plain characters stay, anything else goes in single quotes.
const shellWord = (word: string) =>
  /^[\w./~-]+$/.test(word) ? word : `'${word.replaceAll("'", `'\\''`)}'`;

// The CV the profile of this call names, so a list follows the CV the command itself would use.
async function profileCv(call: Call) {
  if (call.values.profile === undefined) return undefined;
  const profile = await profileOf(call.home, call.values.profile);
  return cvOf(profile.data);
}

async function dispatched(call: Call): Promise<Result<Fields>> {
  const [first = '', ...rest] = call.words;
  switch (first) {
    case 'schema':
      return schema(rest.join(' '));
    case 'cvs':
      return cvs(call);
    case 'init':
      return init(call);
    case 'show':
      return show(call);
    case 'profiles':
      return profiles(call);
    case 'plan':
      return plan(call);
    case 'preview':
      return previewed(call);
    case 'photo':
      return photo(call, rest);
    case 'build':
      return build(call);
    case 'block':
    case 'item':
    case 'cv':
    case 'contact':
      return edit(call, call.words.join(' '));
    default:
      return rejected('oriko', [unknownCommand(call.words.join(' '))]);
  }
}

const unknownCommand = (command: string): Issue => ({
  code: 'UNKNOWN_COMMAND',
  path: '',
  message: `There is no command ${shown(command)}`,
  hint: 'Run the command and use one of the commands it lists',
  command: 'oriko schema',
});

const isSchemaName = (name: string): name is keyof typeof SCHEMAS => Object.hasOwn(SCHEMAS, name);

// Without a name: everything a caller needs to find its way. With one: the accepted input.
function schema(name: string): Result<Fields> {
  if (name === '') {
    const commands = [...OTHER_COMMANDS, ...COMMANDS];
    return done({
      commands,
      options: OPTIONS,
      schemas: Object.keys(SCHEMAS),
      kinds: KINDS,
      icons: ICONS,
      limits: LIMITS,
    });
  }
  if (isSchemaName(name) === false) {
    const issue = {
      ...unknownCommand(name),
      hint: 'Run the command and use one of the schemas it lists',
    };
    return rejected('schema', [issue]);
  }
  return done({ name, input: z.toJSONSchema(SCHEMAS[name]) });
}

async function show(call: Call): Promise<Result<Fields>> {
  const cv = await chosenCv(call.home, call.values.cv);
  if (cv.error !== null) return cv;
  const master = await masterOf(cv.data.path, 'show');
  if (master.error !== null) return master;
  const { blocks, pages } = master.data;
  const id = call.values.block;
  if (id === undefined) return done({ pages, blocks: blocks.map(outline) });
  const block = blocks.find(candidate => candidate.id === id);
  if (block === undefined) return rejected('show', [unknownBlock(id, 'block')]);
  return done({ block });
}

async function masterOf(path: string, step: string): Promise<Result<Master>> {
  const raw = await readJson(path, 'cv');
  if (raw.error !== null) return raw;
  const master = Master.safeParse(raw.data);
  if (master.success === false) return rejected(step, schemaIssues(master.error, [], 'master'));
  return done(master.data);
}

// What a caller needs to pick a block: never its whole text.
const outline = (block: Block) => ({
  id: block.id,
  kind: block.kind,
  column: COLUMN[block.kind],
  section: block.section,
  title: block.title,
  page: block.page,
  hidden: block.hidden,
  items: block.kind === 'job' ? block.bullets.length : block.items.length,
});

// The checked CV of this call, with the profile applied when the call names one.
async function checked(call: Call, profileName = call.values.profile) {
  const profile =
    profileName === undefined ? done(undefined) : await profileOf(call.home, profileName);
  if (profile.error !== null) return profile;
  const cv = await chosenCv(call.home, call.values.cv, cvOf(profile.data));
  if (cv.error !== null) return cv;
  const master = await readJson(cv.data.path, 'cv');
  if (master.error !== null) return master;
  return check(master.data, profile.data);
}

async function profileOf(home: string, name: string) {
  const path = await profilePath(home, name);
  if (path.error !== null) return path;
  return readJson(path.data, 'profile');
}

// The CV a profile names; check() reports a profile that fails its schema, so this one only reads.
const cvOf = (profile: unknown) => {
  const parsed = Profile.safeParse(profile);
  return parsed.success ? parsed.data.cv : undefined;
};

// Every CV with what a caller needs to pick one: its language, its person, and whether it fits.
async function cvs(call: Call): Promise<Result<Fields>> {
  const names = await cvNames(call.home);
  if (names.length === 0) return chosenCv(call.home);
  const listed = [];
  for (const name of names) {
    const cv = await checked({ ...call, values: { ...call.values, cv: name } }, undefined);
    const placed = cv.error === null ? place(cv.data) : cv;
    if (cv.error !== null || placed.error !== null) {
      listed.push({
        name,
        fits: false,
        issues: (placed.error ?? cv.error)?.issues.map(issue => issue.code),
      });
      continue;
    }
    const { language, person } = cv.data;
    listed.push({
      name,
      language,
      person: `${person.firstName} ${person.lastName}`,
      fits: true,
      pages: placed.data.pages.length,
    });
  }
  return done({ cvs: listed });
}

async function init(call: Call): Promise<Result<Fields>> {
  const input = await payload(call, 'init');
  if (input.error !== null) return input;
  const isDryRun = call.values['dry-run'] === true;
  return createCv({ home: call.home, name: call.values.cv, input: input.data, isDryRun });
}

// Every profile with what a caller needs to pick one: its CV, whether it builds, and on how many pages.
async function profiles(call: Call): Promise<Result<Fields>> {
  const names = await cvNames(call.home);
  if (names.length === 0) return chosenCv(call.home);
  const listed = [];
  for (const name of await profileNames(call.home)) {
    const profile = await profileOf(call.home, name);
    const cv = cvOf(profile.data) ?? (names.length === 1 ? names[0] : undefined);
    const built = await checked(call, name);
    const placed = built.error === null ? place(built.data) : built;
    const issues = placed.error?.issues.map(issue => issue.code);
    listed.push(
      placed.error === null
        ? { name, cv, fits: true, pages: placed.data.pages.length }
        : { name, cv, fits: false, issues },
    );
  }
  return done({ profiles: listed });
}

async function previewed(call: Call): Promise<Result<Fields>> {
  const cv = await checked(call);
  if (cv.error !== null) return cv;
  const placed = place(cv.data);
  if (placed.error !== null) return placed;
  return done({ preview: preview(cv.data, placed.data) });
}

async function photo(call: Call, words: string[]): Promise<Result<Fields>> {
  const [action, source] = words;
  if (action !== 'set') return rejected('oriko', [unknownCommand(call.words.join(' '))]);
  const isDryRun = call.values['dry-run'] === true;
  return setPhoto({
    home: call.home,
    cwd: call.io.cwd,
    source,
    cv: call.values.cv,
    profile: call.values.profile,
    isDryRun,
  });
}

async function plan(call: Call): Promise<Result<Fields>> {
  const cv = await checked(call);
  if (cv.error !== null) return cv;
  return place(cv.data);
}

async function build(call: Call): Promise<Result<Fields>> {
  const style = STYLES.find(known => known === (call.values.style ?? 'classic'));
  if (style === undefined) return rejected('build', [unknownStyle(call.values.style ?? '')]);
  const out = await outputPath(call.io.cwd, call.values.out);
  if (out.error !== null) return out;
  const cv = await checked(call);
  if (cv.error !== null) return cv;
  const placed = place(cv.data);
  if (placed.error !== null) return placed;
  const docx = await rendered(call.home, cv.data, placed.data, style);
  if (docx.error !== null) return docx;
  const isDryRun = call.values['dry-run'] === true;
  if (isDryRun === false) await writeAtomic(out.data, docx.data);
  return done({
    out: relative(call.io.cwd, out.data),
    style,
    bytes: docx.data.length,
    pages: placed.data.pages.length,
    written: isDryRun === false,
  });
}

// Only the classic look shows the photo, so only it reads the photo file.
async function rendered(home: string, cv: Master, plan: Plan, style: (typeof STYLES)[number]) {
  if (style === 'terminal') return renderTerminal(cv, plan);
  const picture = await photoBytes(home, cv.person.photo);
  if (picture.error !== null) return picture;
  return render(cv, plan, picture.data);
}

const unknownStyle = (style: string): Issue => ({
  code: 'UNKNOWN_STYLE',
  path: 'style',
  message: `No look is called ${shown(style)}`,
  hint: `Use one of: ${STYLES.join(', ')}`,
});

async function edit(call: Call, command: string): Promise<Result<Fields>> {
  const input = await payload(call, command);
  if (input.error !== null) return input;
  const cv = await chosenCv(call.home, call.values.cv);
  if (cv.error !== null) return cv;
  const master = await readJson(cv.data.path, 'cv');
  if (master.error !== null) return master;
  const edited = apply(master.data, command, input.data);
  if (edited.error !== null) return edited;
  const isDryRun = call.values['dry-run'] === true;
  if (isDryRun === false)
    await writeAtomic(cv.data.path, `${JSON.stringify(edited.data, null, 2)}\n`);
  return done({ command, written: isDryRun === false, ...fit(edited.data) });
}

// An edit may make the CV too long. The edit still stands; the answer says so, so the caller can act.
function fit(master: Master) {
  const cv = check(master);
  const placed = cv.error === null ? place(cv.data) : cv;
  return { fits: placed.error === null, layout: placed.error?.issues ?? [] };
}

async function payload(call: Call, command: string): Promise<Result<unknown>> {
  const raw = call.values.json ?? (await call.io.stdin());
  const isEmpty = raw === null || raw.trim() === '';
  if (isEmpty) return rejected(command, [missingInput(command)]);
  if (Buffer.byteLength(raw) > LIMITS.inputBytes) return rejected(command, [tooLarge('json')]);
  const value = trySync$((): unknown => JSON.parse(raw));
  if (value.error !== null) return rejected(command, [invalidJson('The input')], value.error);
  return done(value.data);
}

const missingInput = (command: string): Issue => ({
  ...missingOption('json', 'the input of the command'),
  code: 'MISSING_INPUT',
  hint: 'Run the command for the input shape, then pass it with --json or through stdin',
  command: schemaCommand(command),
});
