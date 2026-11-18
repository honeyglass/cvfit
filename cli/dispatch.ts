/**
 * The routing of a checked call to its command, and the thin adapters of the commands.
 *
 * dispatched: the answer of the command a call names.
 * masterOf: the master file of a path, read and parsed.
 * outline: what a caller needs to pick a block, never its whole text.
 *
 * @example const result = await dispatched(call);
 */
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import { COLUMN } from '../core/limits.ts';
import { check, schemaIssues, unknownBlock } from '../core/check.ts';
import { Master } from '../core/cv.schema.ts';
import type { Block } from '../core/cv.schema.ts';
import { apply } from '../edit/apply.ts';
import { place } from '../core/place.ts';
import { readJson, writeAll } from '../core/files.ts';
import { chosenCv, cvNames, heldCvs, profileNames } from '../core/home.ts';
import { createCv, cvNameMissing } from '../cv/init.ts';
import { setPhoto } from '../classic/photo.ts';
import { readDocuments } from '../read/documents.ts';
import { setProfile } from '../profile/set.ts';
import { showProfile } from '../profile/show.ts';
import { actionsOf } from './route.ts';
import { checked, cvOf, profileCv, profileOf } from './cv.ts';
import { schema } from './describe.ts';
import { build, previewed } from './build.ts';
import { payload } from './input.ts';
import type { Call, Fields } from './types.ts';

export async function dispatched(call: Call): Promise<Result<Fields>> {
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

export async function masterOf(path: string, step: string): Promise<Result<Master>> {
  const raw = await readJson(path, 'cv');
  if (raw.error !== null) return raw;
  const master = Master.safeParse(raw.data);
  if (master.success === false) return rejected(step, schemaIssues(master.error, [], 'master'));
  return done(master.data);
}

// What a caller needs to pick a block: never its whole text.
export const outline = (block: Block) => ({
  id: block.id,
  kind: block.kind,
  column: COLUMN[block.kind],
  section: block.section,
  title: block.title,
  page: block.page,
  hidden: block.hidden,
  items: block.kind === 'job' ? block.bullets.length : block.items.length,
});

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
