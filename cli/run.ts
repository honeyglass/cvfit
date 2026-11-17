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
import { resolve } from 'node:path';
import { $try, causeText, refusal, shown, trySync$ } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { Rejection, done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import { COLUMN, EXIT, ICONS, KINDS, LIMITS, STYLES } from '../core/limits.ts';
import { check, schemaIssues, unknownBlock } from '../data/check.ts';
import { Block, Master, Profile } from '../data/cv.schema.ts';
import { apply } from '../edit/apply.ts';
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
  writeAll,
} from './files.ts';
import { optionText, readArgs } from './args.ts';
import type { Values } from './args.ts';
import {
  COMMANDS,
  EVERYWHERE,
  NEW_NAME,
  OPTIONS,
  SHAPES,
  isListed,
  missingHint,
} from './commands.ts';
import type { Command, CommandName, ListedOption, OptionName } from './commands.ts';
import { chosenCv, cvNames, heldCvs, homeIssues, profileNames, profilePath } from './home.ts';
import { createCv, cvNameMissing } from './init.ts';
import { nextSteps } from './next.ts';
import type { Step } from './next.ts';
import { setPhoto } from './photo.ts';
import { readDocuments } from './read.ts';
import { setProfile, showProfile } from './profile.ts';
import type { Web } from '../read/web.ts';

export type Io = {
  /** The data folder: every CV in cvs/ and every profile in profiles/. */
  home: string;
  cwd: string;
  isTTY: boolean;
  /** The network a download goes through. */
  web: Web;
  /** The text piped in, or null when nothing is piped. */
  stdin: () => Promise<string | null>;
  write: (text: string) => void;
};

type Fields = Record<string, unknown>;
type Call = {
  io: Io;
  home: string;
  values: Values;
  /** The words after the command; every word when the call names none. */
  rest: string[];
  command?: CommandName;
};

/**
 * @param argv - the arguments after the program name
 * @param io - the surroundings of the call
 * @returns the exit code
 */
export async function run(argv: string[], io: Io) {
  const { data, error } = await $try(() => answered(argv, io));
  if (error !== null) return crashed(error, io);
  io.write(data.asText ? text(data.result, io.isTTY) : json(data.result));
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

// Text for a person: the answer, and at a terminal its next steps below it. Piped text stays bare.
function text(result: Result<Fields>, isTTY: boolean) {
  if (result.error === null) {
    const { next, ...data } = result.data;
    const body =
      typeof data.preview === 'string' ? data.preview : `${JSON.stringify(data, null, 2)}\n`;
    const lines = isTTY && Array.isArray(next) ? next.filter(isStep).map(nextLine) : [];
    return lines.length === 0 ? body : `${body}${lines.join('\n')}\n`;
  }
  const issues = result.error.issues.map(
    issue =>
      `- ${issue.code} at ${shown(issue.path)}: ${shown(issue.message)}. ${issue.hint}.` +
      (issue.command === undefined ? '' : ` Command: ${issue.command}`),
  );
  return `${[refusal(result.error.refusal), ...issues].join('\n')}\n`;
}

const isStep = (value: unknown): value is Step =>
  typeof value === 'object' && value !== null && 'does' in value;

function nextLine(step: Step) {
  if (step.command === undefined) return `Next: ${step.does}`;
  const needs = step.needs?.map(need => (need === 'file' ? '<file>' : `--${need}`)).join(', ');
  return needs === undefined ? `Next: ${step.command}` : `Next: ${step.command} (needs ${needs})`;
}

const OUTPUTS = ['json', 'text'] as const;

async function answered(argv: string[], io: Io) {
  const args = readArgs(argv);
  const { values } = args;
  const isKnownOutput = values.output === undefined || isOutput(values.output);
  const asText = isKnownOutput && values.output !== undefined ? values.output === 'text' : io.isTTY;
  const home = values.home === undefined ? io.home : resolve(io.cwd, values.home);
  const found = commandOf(args.words);
  const call = { io, home, values, rest: found.rest, command: found.name };
  // An empty --home is refused below; until then no folder, not even the default one, is opened.
  const isHomeEmpty = args.empty.includes('home');
  const issues = [
    ...commandIssues(found, args.given),
    ...args.issues,
    ...(isHomeEmpty ? [] : await homeIssues(home)),
    ...(isKnownOutput ? [] : [unknownOutput(values.output ?? '')]),
  ];
  if (issues.length > 0)
    return { result: await withCommands(call, rejected('oriko', issues)), asText };
  const result = args.empty.length === 0 ? await dispatched(call) : await emptied(call, args.empty);
  return { result: await withCommands(call, withNext(call, result)), asText };
}

const isOutput = (output: string) => OUTPUTS.some(known => known === output);

type Found = { name: CommandName | undefined; rest: string[] };

// The command whose words lead the call one by one, such as 'block' and 'add' for 'block add'.
function commandOf(words: string[]): Found {
  const name = Object.keys(COMMANDS)
    .filter(isCommandName)
    .find(known => known.split(' ').every((part, index) => words[index] === part));
  if (name === undefined) return { name, rest: words };
  return { name, rest: words.slice(name.split(' ').length) };
}

// A command takes only its own options and words; anything more is named, never dropped.
// Without a command, only oriko alone and a group alone pass, with the options of every command.
function commandIssues(found: Found, given: OptionName[]): Issue[] {
  const options = [...new Set(given)];
  if (found.name === undefined) {
    const [group, ...more] = found.rest;
    const isListing = group === undefined || (more.length === 0 && actionsOf(group).length > 0);
    if (isListing === false) return [unknownCommand(found.rest)];
    const listing = group === undefined ? 'oriko schema' : `oriko ${group}`;
    return options
      .filter(option => EVERYWHERE.includes(option) === false)
      .map(option => optionNotAllowed(option, 'oriko without a command', listing));
  }
  const name = found.name;
  const command: Command = COMMANDS[name];
  const allowed: OptionName[] = [...command.options, ...EVERYWHERE];
  const words = command.joinsWords === true ? [] : found.rest.slice(command.words?.length ?? 0);
  return [
    ...options
      .filter(option => allowed.includes(option) === false)
      .map(option => optionNotAllowed(option, `The command ${name}`, `oriko schema ${name}`)),
    ...words.map(word => unexpectedArgument(word, name)),
  ];
}

// The actions of a group, such as 'block add' for 'block'; none for a word that is no group.
const actionsOf = (group: string) =>
  Object.keys(COMMANDS).filter(name => {
    const [first, action] = name.split(' ');
    return first === group && action !== undefined;
  });

const optionNotAllowed = (option: string, who: string, listing: string): Issue => ({
  code: 'OPTION_NOT_ALLOWED',
  path: option,
  message: `${who} takes no --${option}`,
  hint: 'Run the command and use only the options it lists',
  command: listing,
});

const unexpectedArgument = (word: string, command: string): Issue => ({
  code: 'UNEXPECTED_ARGUMENT',
  path: word,
  message: `The command ${command} takes no word ${shown(word)}`,
  hint: 'Run the command and pass only the words and options it lists',
  command: `oriko schema ${command}`,
});

const unknownOutput = (output: string): Issue => ({
  code: 'UNKNOWN_OUTPUT',
  path: 'output',
  message: `No output is called ${shown(output)}`,
  hint: `Use one of: ${OUTPUTS.join(', ')}`,
});

// Options without a value: one list answers its values; a free value, a new name, or a second
// list is refused, so no option passes unanswered.
async function emptied(call: Call, empty: OptionName[]): Promise<Result<Fields>> {
  const fresh: OptionName[] = call.command === undefined ? [] : (freshOf(call.command) ?? []);
  const lists = empty.filter(isListed).filter(option => fresh.includes(option) === false);
  const free = empty.filter(option => lists.some(listed => listed === option) === false);
  const [only] = lists;
  const issues = [
    ...free.map(option =>
      fresh.includes(option) ? newNameMissing(option) : missingValue(option, call.command),
    ),
    ...(lists.length > 1 ? lists.map(oneListAtATime) : []),
  ];
  if (issues.length > 0 || only === undefined) return rejected('oriko', issues);
  return valuesOf(call, only);
}

const oneListAtATime = (option: string): Issue => ({
  code: 'MISSING_VALUE',
  path: option,
  message: `The option --${option} has no value, and another option has none either`,
  hint: 'Leave one option without a value at a time, and give the others a value',
});

const freshOf = (name: CommandName) => {
  const command: Command = COMMANDS[name];
  return command.fresh;
};

const newNameMissing = (option: string): Issue => ({
  code: 'MISSING_VALUE',
  path: option,
  message: `The option --${option} has no value`,
  hint: NEW_NAME,
  command: `oriko show --${option}`,
});

// One case per listed option; a new one fails the type check until it has its case.
async function valuesOf(call: Call, option: ListedOption): Promise<Result<Fields>> {
  switch (option) {
    case 'cv':
      return done({ option, values: await cvValues(call) });
    case 'profile':
      return done({ option, values: await profileNames(call.home) });
    case 'style':
      return done({ option, values: [...STYLES] });
    case 'output':
      return done({ option, values: [...OUTPUTS] });
    case 'block':
      return blockValues(call);
  }
}

// With a profile, only the CV it names passes, so the list holds only that one.
async function cvValues(call: Call) {
  const names = await cvNames(call.home);
  const fromProfile = await profileCv(call);
  return fromProfile !== undefined && names.includes(fromProfile) ? [fromProfile] : names;
}

// The blocks of the CV this call names, in the outline show answers, so a caller picks an id.
async function blockValues(call: Call): Promise<Result<Fields>> {
  const cv = await chosenCv(call.home, call.values.cv, await profileCv(call));
  if (cv.error !== null) return cv;
  const master = await masterOf(cv.data.path, 'show');
  if (master.error !== null) return master;
  return done({ option: 'block', cv: cv.data.name, values: master.data.blocks.map(outline) });
}

function missingValue(option: OptionName, command: CommandName | undefined): Issue {
  const issue = {
    code: 'MISSING_VALUE',
    path: option,
    message: `The option --${option} has no value`,
    hint: missingHint(option),
  };
  return option === 'json' ? { ...issue, command: schemaCommand(command ?? '') } : issue;
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
  const home = homeArg(call);
  const issues = result.error.issues.map(issue => {
    const command =
      issue.code === 'UNKNOWN_BLOCK' ? (issue.command ?? blockCommand) : issue.command;
    return command === undefined ? issue : { ...issue, command: `${command}${home}` };
  });
  return { data: null, error: new Rejection(result.error.refusal, issues) };
}

// A success gets the steps that follow it, with this call's CV and data folder in each command.
function withNext(call: Call, result: Result<Fields>): Result<Fields> {
  if (result.error !== null) return result;
  const steps = nextSteps({
    command: call.command,
    selector: selectorOf(call),
    data: result.data,
    isDryRun: call.values['dry-run'] === true,
  });
  if (steps.length === 0) return result;
  const home = homeArg(call);
  const next = steps.map(step =>
    step.command === undefined ? step : { ...step, command: `${step.command}${home}` },
  );
  return done({ ...result.data, next });
}

// Every selector of the call, never a pick: a profile without a CV needs the --cv beside it.
function selectorOf(call: Call) {
  const { profile, cv } = call.values;
  const ofProfile = profile === undefined ? '' : optionText('profile', profile);
  return cv === undefined ? ofProfile : `${ofProfile}${optionText('cv', cv)}`;
}

const homeArg = (call: Call) =>
  call.values.home === undefined ? '' : optionText('home', call.values.home);

async function blockListCommand(call: Call, issues: Issue[]) {
  if (issues.some(issue => issue.code === 'UNKNOWN_BLOCK') === false) return undefined;
  const cv = await chosenCv(call.home, call.values.cv, await profileCv(call));
  return cv.error === null ? `oriko show${optionText('cv', cv.data.name)} --block` : undefined;
}

// The CV the profile of this call names, so a list follows the CV the command itself would use.
async function profileCv(call: Call) {
  if (call.values.profile === undefined) return undefined;
  const profile = await profileOf(call.home, call.values.profile);
  return cvOf(profile.data);
}

async function dispatched(call: Call): Promise<Result<Fields>> {
  switch (call.command) {
    case undefined:
      return unrouted(call);
    case 'schema':
      return schema(call.rest.join(' '));
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
    case 'read':
      return read(call);
    case 'profile set':
      return profileSet(call);
    case 'profile show':
      return showProfile(call.home, call.values.profile);
    case 'photo set':
      return photo(call, call.rest[0]);
    case 'build':
      return build(call);
    default:
      return edit(call, call.command);
  }
}

// A call without a command, which commandIssues let through: the start, or a group alone.
async function unrouted(call: Call): Promise<Result<Fields>> {
  const [group] = call.rest;
  if (group === undefined) return start(call);
  return done({ command: group, values: actionsOf(group) });
}

// Where a caller stands: the data folder with its CVs and profiles, empty lists when it has none.
async function start(call: Call): Promise<Result<Fields>> {
  return done({
    home: call.home,
    cvs: await cvNames(call.home),
    profiles: await profileNames(call.home),
  });
}

// A known group with a wrong action points to the group's list, anything else to the full one.
function unknownCommand(words: string[]): Issue {
  const [group = ''] = words;
  return {
    code: 'UNKNOWN_COMMAND',
    path: 'command',
    message: `There is no command ${shown(words.join(' '))}`,
    hint: 'Run the command and use one of the commands it lists',
    command: actionsOf(group).length > 0 ? `oriko ${group}` : 'oriko schema',
  };
}

const isCommandName = (name: string): name is CommandName => Object.hasOwn(COMMANDS, name);
const isShapeName = (name: string): name is keyof typeof SHAPES => Object.hasOwn(SHAPES, name);
const isSchemaName = (name: string) => isCommandName(name) || isShapeName(name);

// Without a name: everything a caller needs to find its way. With one: a command or a shape.
function schema(name: string): Result<Fields> {
  if (name === '') {
    const options = Object.fromEntries(
      Object.entries(OPTIONS).map(([key, spec]) => [key, spec.text]),
    );
    return done({
      commands: Object.keys(COMMANDS),
      options,
      schemas: Object.keys(SHAPES),
      kinds: KINDS,
      icons: ICONS,
      limits: LIMITS,
    });
  }
  if (isShapeName(name)) return done({ name, input: z.toJSONSchema(SHAPES[name]) });
  if (isCommandName(name) === false) return rejected('schema', [unknownSchema(name)]);
  const command: Command = COMMANDS[name];
  const options = Object.fromEntries(
    [...command.options, ...EVERYWHERE].map(option => [option, OPTIONS[option].text]),
  );
  const input = command.input === undefined ? null : z.toJSONSchema(command.input);
  return done({ name, does: command.does, options, words: command.words ?? [], input });
}

const unknownSchema = (name: string): Issue => ({
  code: 'UNKNOWN_COMMAND',
  path: 'name',
  message: `No command or shape is called ${shown(name)}`,
  hint: 'Run the command and use one of the commands or schemas it lists',
  command: 'oriko schema',
});

async function show(call: Call): Promise<Result<Fields>> {
  const cv = await chosenCv(call.home, call.values.cv, await profileCv(call));
  if (cv.error !== null) return cv;
  const master = await masterOf(cv.data.path, 'show');
  if (master.error !== null) return master;
  const { blocks, pages } = master.data;
  const id = call.values.block;
  if (id === undefined) return done({ cv: cv.data.name, pages, blocks: blocks.map(outline) });
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
  const names = await heldCvs(call.home);
  if (names.error !== null) return names;
  const listed = [];
  for (const name of names.data) {
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

// Without a name and an input, both are named in one answer.
async function init(call: Call): Promise<Result<Fields>> {
  const input = await payload(call, 'init');
  const name = call.values.cv === undefined ? [cvNameMissing()] : [];
  if (input.error !== null) return rejected('init', [...name, ...input.error.issues]);
  const isDryRun = call.values['dry-run'] === true;
  return createCv({ home: call.home, name: call.values.cv, input: input.data, isDryRun });
}

// Every profile with what a caller needs to pick one: its CV, whether it builds, and on how many pages.
async function profiles(call: Call): Promise<Result<Fields>> {
  const cvs = await heldCvs(call.home);
  if (cvs.error !== null) return cvs;
  const only = cvs.data.length === 1 ? cvs.data[0] : undefined;
  const listed = [];
  for (const name of await profileNames(call.home)) {
    const profile = await profileOf(call.home, name);
    const cv = cvOf(profile.data) ?? only;
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

async function profileSet(call: Call): Promise<Result<Fields>> {
  const input = await payload(call, 'profile set');
  if (input.error !== null) return input;
  return setProfile({
    home: call.home,
    name: call.values.profile,
    input: input.data,
    isReplace: call.values.replace === true,
    isDryRun: call.values['dry-run'] === true,
  });
}

async function read(call: Call): Promise<Result<Fields>> {
  const { values } = call;
  return readDocuments({
    home: call.home,
    cwd: call.io.cwd,
    web: call.io.web,
    posting: values.posting,
    notes: values.notes ?? [],
    resume: values.resume,
    profile: values.profile,
    cv: values.cv,
    profileCv: await profileCv(call),
    isReplace: values.replace === true,
    isDryRun: values['dry-run'] === true,
  });
}

async function photo(call: Call, source: string | undefined): Promise<Result<Fields>> {
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
  const files = [{ path: out.data.path, content: docx.data }];
  const written = isDryRun ? done(undefined) : await writeAll(files, 'out');
  if (written.error !== null) return written;
  return done({
    out: out.data.name,
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
  const content = `${JSON.stringify(edited.data, null, 2)}\n`;
  const files = [{ path: cv.data.path, content }];
  const written = isDryRun ? done(undefined) : await writeAll(files, 'home');
  if (written.error !== null) return written;
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
