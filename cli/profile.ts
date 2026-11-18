/**
 * The commands for the profile of one job posting: store it checked, and show it with its posting.
 *
 * setProfile: checks a whole profile against its CV, then stores it, and names what it changed.
 * showProfile: the stored profile and the posting read for it.
 *
 * A profile is checked by the same check plan runs, before it is written, so a refused profile is
 * never stored. It replaces the stored one whole, and only on request, so the answer names every
 * part it adds, changes or removes.
 *
 * @example const answer = await setProfile({ home, name: 'acme', input, isReplace: false, isDryRun: true });
 */
import { join } from 'node:path';
import { shown, trySync$ } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import { check, schemaIssues } from '../core/check.ts';
import { Id, Profile } from '../core/cv.schema.ts';
import { place } from '../core/place.ts';
import { optionText } from '../core/options.ts';
import { existingText, invalidJson, missingOption, readJson, writeAll } from '../core/files.ts';
import { chosenCv } from '../core/home.ts';

type Fields = Record<string, unknown>;
type Request = {
  home: string;
  name: string | undefined;
  input: unknown;
  isReplace: boolean;
  isDryRun: boolean;
};

/**
 * @param request - the data folder, the profile's name, the whole profile, and whether to write
 * @returns where it is stored, what it adds, changes and removes, and whether it fits its pages
 */
export async function setProfile(request: Request): Promise<Result<Fields>> {
  const name = profileName(request.name, 'profile set');
  if (name.error !== null) return name;
  const profile = Profile.safeParse(request.input);
  if (profile.success === false)
    return rejected('profile set', schemaIssues(profile.error, [], 'profile'));
  const fits = await checkedFit(request.home, profile.data);
  if (fits.error !== null) return fits;
  const stored = `profiles/${name.data}.json`;
  const path = join(request.home, stored);
  const existing = await existingText(path);
  if (existing.error !== null) return existing;
  if (existing.data !== null && request.isReplace === false)
    return rejected('profile set', [profileExists(name.data)]);
  const content = `${JSON.stringify(request.input, null, 2)}\n`;
  const isWriting = request.isDryRun === false && existing.data !== content;
  const written = isWriting ? await writeAll([{ path, content }], 'home') : done(undefined);
  if (written.error !== null) return written;
  const changes = changesOf(parsedOrEmpty(existing.data), request.input);
  return done({ name: name.data, stored, written: isWriting, ...changes, ...fits.data });
}

/**
 * @param home - the data folder
 * @param name - the profile's name
 * @returns the stored profile and the posting read for it, each null when there is none
 */
export async function showProfile(home: string, name: string | undefined): Promise<Result<Fields>> {
  const checkedName = profileName(name, 'profile show');
  if (checkedName.error !== null) return checkedName;
  const profile = await storedProfile(join(home, 'profiles', `${checkedName.data}.json`));
  if (profile.error !== null) return profile;
  const posting = await existingText(join(home, 'profiles', `${checkedName.data}.posting.md`));
  if (posting.error !== null) return posting;
  if (profile.data === null && posting.data === null)
    return rejected('profile show', [unknownProfile(checkedName.data)]);
  return done({ name: checkedName.data, profile: profile.data, posting: posting.data });
}

// The name becomes a file name, so it passes the id pattern before any path is built from it.
function profileName(name: string | undefined, command: string): Result<string> {
  if (name === undefined) return rejected(command, [profileMissing(command)]);
  const parsed = Id.safeParse(name);
  if (parsed.success === false)
    return rejected(command, schemaIssues(parsed.error, ['profile'], command));
  return done(parsed.data);
}

// The checks plan runs on the profile's CV; a CV too long for its pages is answered, not refused.
async function checkedFit(home: string, profile: Profile) {
  const cv = await chosenCv(home, undefined, profile.cv);
  if (cv.error !== null) return cv;
  const master = await readJson(cv.data.path, 'cv');
  if (master.error !== null) return master;
  const checked = check(master.data, profile);
  if (checked.error !== null) return checked;
  const placed = place(checked.data);
  return done({
    cv: cv.data.name,
    fits: placed.error === null,
    layout: placed.error?.issues ?? [],
  });
}

async function storedProfile(path: string): Promise<Result<Profile | null>> {
  const text = await existingText(path);
  if (text.error !== null) return text;
  if (text.data === null) return done(null);
  const raw = text.data;
  const value = trySync$((): unknown => JSON.parse(raw));
  if (value.error !== null)
    return rejected('profile show', [invalidJson(`The file ${shown(path)}`)], value.error);
  const profile = Profile.safeParse(value.data);
  if (profile.success === false)
    return rejected('profile show', schemaIssues(profile.error, [], 'profile'));
  return done(profile.data);
}

// The stored profile as a value; an unreadable one counts as empty, so every part counts as added.
function parsedOrEmpty(text: string | null) {
  if (text === null) return {};
  const value = trySync$((): unknown => JSON.parse(text));
  return value.error === null ? value.data : {};
}

// The parts of a profile: each top-level field, and each block or person field one level down.
function partsOf(profile: unknown) {
  const parts = new Map<string, string>();
  if (isRecord(profile) === false) return parts;
  for (const [key, value] of Object.entries(profile)) {
    const isNested = (key === 'blocks' || key === 'person') && isRecord(value);
    if (isNested === false) {
      parts.set(key, JSON.stringify(value));
      continue;
    }
    for (const [inner, part] of Object.entries(value))
      parts.set(`${key}.${inner}`, JSON.stringify(part));
  }
  return parts;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;

function changesOf(before: unknown, after: unknown) {
  const old = partsOf(before);
  const fresh = partsOf(after);
  const sorted = (keys: string[]) => keys.sort();
  return {
    added: sorted([...fresh.keys()].filter(key => old.has(key) === false)),
    changed: sorted(
      [...fresh.keys()].filter(key => old.has(key) && old.get(key) !== fresh.get(key)),
    ),
    removed: sorted([...old.keys()].filter(key => fresh.has(key) === false)),
  };
}

const profileMissing = (command: string): Issue => ({
  ...missingOption(
    'profile',
    'the name of the profile',
    'Run the command for the existing profiles, or pass a new name in lower-case words joined by hyphens',
  ),
  command: `oriko ${command} --profile`,
});

const profileExists = (name: string): Issue => ({
  code: 'PROFILE_EXISTS',
  path: 'profile',
  message: `The profile ${shown(name)} is already stored`,
  hint: 'Run the command to see it; add --replace to overwrite it, or pass another --profile',
  command: `oriko profile show${optionText('profile', name)}`,
});

const unknownProfile = (name: string): Issue => ({
  code: 'UNKNOWN_PROFILE',
  path: 'profile',
  message: `The data folder has no profile ${shown(name)}, nor a posting read for it`,
  hint: 'Run the command and use one of the profile names it lists',
  command: 'oriko plan --profile',
});
