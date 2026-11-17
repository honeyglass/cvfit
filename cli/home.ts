/**
 * The data folder: every CV in cvs/, and one profile per job posting in profiles/.
 *
 * cvNames, profileNames: the CVs and the profiles of a data folder, by name.
 * chosenCv: the CV a command works on, from --cv, the profile, or the only CV there is.
 * profilePath: the file of one profile.
 *
 * A CV or a profile is found by its name among the files that exist, never by a path built from
 * the name alone, so a name cannot lead out of the folder.
 *
 * @example const cv = await chosenCv(home, values.cv, profile.cv);
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { $try, shown } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import { isMissing } from './files.ts';

const SUFFIX = '.json';
const NO_FILES: string[] = [];

export type CvFile = { name: string; path: string };

/**
 * @param home - the data folder
 * @param folder - 'cvs' or 'profiles'
 * @returns the names of the JSON files in that folder, in alphabetical order; none when it is missing
 */
async function namesIn(home: string, folder: 'cvs' | 'profiles') {
  const files = await $try(readdir(join(home, folder)), { or: NO_FILES, expected: isMissing });
  return files
    .filter(file => file.endsWith(SUFFIX))
    .map(file => file.slice(0, -SUFFIX.length))
    .sort();
}

export const cvNames = (home: string) => namesIn(home, 'cvs');
export const profileNames = (home: string) => namesIn(home, 'profiles');

/**
 * @param home - the data folder
 * @param explicit - the name the caller passed with --cv, if any
 * @param fromProfile - the name the profile names in its field cv, if any
 * @returns the name and the path of the CV
 */
export async function chosenCv(
  home: string,
  explicit?: string,
  fromProfile?: string,
): Promise<Result<CvFile>> {
  const isMismatch =
    explicit !== undefined && fromProfile !== undefined && explicit !== fromProfile;
  if (isMismatch) return rejected('read', [cvMismatch(explicit, fromProfile)]);
  const names = await cvNames(home);
  if (names.length === 0) return rejected('read', [noCv(home)]);
  const name = explicit ?? fromProfile ?? (names.length === 1 ? names[0] : undefined);
  if (name === undefined) return rejected('read', [cvRequired()]);
  if (names.includes(name) === false) return rejected('read', [unknownCv(name)]);
  return done({ name, path: join(home, 'cvs', `${name}${SUFFIX}`) });
}

/**
 * @param home - the data folder
 * @param name - the name of a profile, as profileNames() lists it
 * @returns the path of its file
 */
export async function profilePath(home: string, name: string): Promise<Result<string>> {
  const names = await profileNames(home);
  if (names.includes(name) === false) return rejected('read', [unknownProfile(name, names)]);
  return done(join(home, 'profiles', `${name}${SUFFIX}`));
}

const noCv = (home: string): Issue => ({
  code: 'NO_CV',
  path: 'home',
  message: `The data folder ${shown(home)} holds no CV`,
  hint: 'Check --home, or create a CV with: oriko init --cv NAME --json ...',
});

// --cv without a value lists the CVs, so the command answers every name the caller may pass.
const LIST_CVS = 'oriko show --cv';

const cvRequired = (): Issue => ({
  code: 'CV_REQUIRED',
  path: 'cv',
  message: 'The data folder holds several CVs and the call names none',
  hint: 'Run the command, then pass --cv with one of the CV names it lists',
  command: LIST_CVS,
});

const unknownCv = (name: string): Issue => ({
  code: 'UNKNOWN_CV',
  path: 'cv',
  message: `The data folder has no CV ${shown(name)}`,
  hint: 'Run the command and use one of the CV names it lists',
  command: LIST_CVS,
});

const cvMismatch = (explicit: string, fromProfile: string): Issue => ({
  code: 'CV_MISMATCH',
  path: 'cv',
  message: `--cv names ${shown(explicit)}, but the profile belongs to ${shown(fromProfile)}`,
  hint: 'Leave out --cv, or change the field cv of the profile',
});

function unknownProfile(name: string, names: string[]): Issue {
  const message = `The data folder has no profile ${shown(name)}`;
  if (names.length === 0)
    return {
      code: 'UNKNOWN_PROFILE',
      path: 'profile',
      message,
      hint: 'Add a profile as profiles/NAME.json to the data folder',
    };
  return {
    code: 'UNKNOWN_PROFILE',
    path: 'profile',
    message,
    hint: 'Run the command and use one of the profile names it lists',
    command: 'oriko plan --profile',
  };
}
