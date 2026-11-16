/**
 * The command that swaps the photo: any PNG or JPEG becomes the square PNG the CV uses.
 *
 * setPhoto: stores a picture as the photo of a CV, or of one profile.
 *
 * The picture is copied into the data folder, so the CV never depends on a file elsewhere.
 * Only bytes that decode as a picture are stored, whatever the file is called.
 *
 * @example const answer = await setPhoto({ home, cwd, source: 'portrait.jpg', profile: 'acme', isDryRun: false });
 */
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { $try, shown, trySync$ } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import { LIMITS } from '../core/limits.ts';
import { schemaIssues } from '../data/check.ts';
import { Master, Profile } from '../data/cv.schema.ts';
import { photoUnreadable } from '../render/docx.ts';
import { squarePhoto } from '../render/images.ts';
import { fileNotFound, isMissing, readJson, tooLarge, writeAtomic } from './files.ts';
import { chosenCv, profilePath } from './home.ts';

type Request = {
  home: string;
  cwd: string;
  source: string | undefined;
  cv: string | undefined;
  profile: string | undefined;
  isDryRun: boolean;
};
type Owner = { path: string; photo: string; content: unknown };

/**
 * @param request - the data folder, the picture to store and the profile it is for, if any
 * @returns where the photo was stored, relative to the data folder
 */
export async function setPhoto(request: Request): Promise<Result<Record<string, unknown>>> {
  const { home, cwd, source, cv, profile, isDryRun } = request;
  if (source === undefined) return rejected('photo set', [missingPicture()]);
  const owner = profile === undefined ? await cvOwner(home, cv) : await profileOwner(home, profile);
  if (owner.error !== null) return owner;
  const picture = await squared(resolve(cwd, source));
  if (picture.error !== null) return picture;
  const { path, photo, content } = owner.data;
  if (isDryRun) return done({ command: 'photo set', photo, written: false });
  await mkdir(dirname(join(home, photo)), { recursive: true });
  await writeAtomic(join(home, photo), picture.data);
  await writeAtomic(path, `${JSON.stringify(content, null, 2)}\n`);
  return done({ command: 'photo set', photo, written: true });
}

const missingPicture = (): Issue => ({
  code: 'MISSING_INPUT',
  path: '',
  message: 'The command names no picture',
  hint: 'Pass the path of a PNG or JPEG file: cvfit photo set <file>',
});

// The CV with its photo set to cvs/NAME.png, the photo its profiles share.
async function cvOwner(home: string, explicit: string | undefined): Promise<Result<Owner>> {
  const cv = await chosenCv(home, explicit);
  if (cv.error !== null) return cv;
  const raw = await readJson(cv.data.path, 'cv');
  if (raw.error !== null) return raw;
  const master = Master.safeParse(raw.data);
  if (master.success === false) return rejected('photo set', schemaIssues(master.error, [], 'master'));
  const photo = `cvs/${cv.data.name}.png`;
  return done({ path: cv.data.path, photo, content: { ...master.data, person: { ...master.data.person, photo } } });
}

// A profile with its own photo; the name is one profilePath() found among the existing files.
async function profileOwner(home: string, name: string): Promise<Result<Owner>> {
  const path = await profilePath(home, name);
  if (path.error !== null) return path;
  const raw = await readJson(path.data, 'profile');
  if (raw.error !== null) return raw;
  const profile = Profile.safeParse(raw.data);
  if (profile.success === false) return rejected('photo set', schemaIssues(profile.error, [], 'profile'));
  const photo = `profiles/${name}.png`;
  return done({ path: path.data, photo, content: { ...profile.data, person: { ...profile.data.person, photo } } });
}

async function squared(path: string): Promise<Result<Uint8Array>> {
  const bytes = await $try(readFile(path), { or: null, expected: isMissing });
  if (bytes === null) return rejected('photo set', [fileNotFound(path, 'photo')]);
  if (bytes.length > LIMITS.photoBytes) return rejected('photo set', [tooLarge(shown(path))]);
  const square = trySync$(() => squarePhoto(bytes));
  if (square.error !== null) return rejected('photo set', [photoUnreadable()], square.error);
  return done(square.data);
}
