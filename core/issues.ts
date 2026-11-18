/**
 * The issues core raises, and those several folders raise, each made by one function.
 *
 * schemaIssues, duplicateId, unknownBlock, untitledNotAlone: what the check of a CV finds.
 * fileNotFound, notAFile, notAFolder, tooLarge, invalidJson, pathOutside: the failures of a file.
 * pathRefused, systemRefused: a refusal of the system on a path, by who can solve it.
 * missingOption, cvNameMissing: an option a command needs and the call leaves out.
 * noCv, cvRequired, unknownCv, unknownCvOfProfile, cvMismatch, unknownProfile: what the data
 * folder does not hold.
 * roleTooLong, blockTooTall, pageOverflow: what does not fit the pages.
 * FILE_NOT_FOUND, UNKNOWN_BLOCK: the codes other files compare.
 *
 * @example if (block === undefined) return rejected('show', [issue.unknownBlock(id, 'block')]);
 */
import { shown } from '@honeyglass/utils/ts';
import type { z } from 'zod';
import { SYSTEM_REFUSED } from './errors.ts';
import type { Issue } from './errors.ts';
import { FILE_LIMITS } from './files.limits.ts';
import { NEW_NAME, missingHint } from './options.ts';
import type { OptionName } from './options.ts';

export const FILE_NOT_FOUND = 'FILE_NOT_FOUND';
export const UNKNOWN_BLOCK = 'UNKNOWN_BLOCK';

/**
 * @param error - the error of a failed safeParse
 * @param prefix - the path of the checked value inside the input
 * @param name - the schema to point the caller to
 * @returns one issue per schema issue
 */
export function schemaIssues(error: z.ZodError, prefix: PropertyKey[], name: string): Issue[] {
  return error.issues.map(issue => ({
    code: 'SCHEMA',
    path: [...prefix, ...issue.path].join('.'),
    message: issue.message,
    hint: 'Run the command for the accepted shape',
    command: `oriko schema ${name}`,
  }));
}

export const duplicateId = (id: string): Issue => ({
  code: 'DUPLICATE_ID',
  path: `blocks.${id}`,
  message: `Two blocks have the id ${shown(id)}`,
  hint: 'Give every block its own id',
});

// The cli adds the command that lists the block ids, as only it knows the name of the CV.
export const unknownBlock = (id: string, path: string): Issue => ({
  code: UNKNOWN_BLOCK,
  path,
  message: `No block has the id ${shown(id)}`,
  hint: 'Run the command and use one of the block ids it lists',
});

export const untitledNotAlone = (id: string): Issue => ({
  code: 'UNTITLED_NOT_ALONE',
  path: `blocks.${id}`,
  message: `The block ${shown(id)} has no title but shares its section with a block next to it`,
  hint: 'Give the block a title, or make it the only block of its section',
});

export const fileNotFound = (path: string, option: string): Issue => ({
  code: FILE_NOT_FOUND,
  path: option,
  message: `There is no file ${shown(path)}`,
  hint: 'Check the path, or pass the full path of the file',
});

export const notAFile = (path: string, option: string): Issue => ({
  code: 'NOT_A_FILE',
  path: option,
  message: `${shown(path)} is no file`,
  hint: 'Pass the path of a file, not of a folder',
});

export const notAFolder = (path: string, option: string): Issue => ({
  code: 'NOT_A_FOLDER',
  path: option,
  message: `${shown(path)} is no folder`,
  hint: 'Pass the path of a folder, not of a file',
});

export const tooLarge = (path: string, limit: number = FILE_LIMITS.inputBytes): Issue => ({
  code: 'INPUT_TOO_LARGE',
  path,
  message: `The input is larger than ${limit} bytes`,
  hint: `Send at most ${limit} bytes; a CV is a few thousand, a photo a few million`,
});

export const invalidJson = (what: string): Issue => ({
  code: 'INVALID_JSON',
  path: '',
  message: `${what} is not valid JSON`,
  hint: 'Send one valid JSON value',
});

export const pathOutside = (option: string, path: string, folder: string): Issue => ({
  code: 'PATH_OUTSIDE',
  path: option,
  message: `The path ${shown(path)} leaves the folder ${shown(folder)}`,
  hint: 'Use a path inside that folder, without a link that leads out of it',
});

export const pathRefused = (path: string, option: string, code: string): Issue => ({
  code: 'PATH_REFUSED',
  path: option,
  message: `The system refused ${shown(path)}: ${code}`,
  hint: 'Check the path and that you may read and write there',
});

export const systemRefused = (path: string, option: string, code: string): Issue => ({
  code: SYSTEM_REFUSED,
  path: option,
  message: `The system refused ${shown(path)}: ${code}`,
  hint: 'Tell the person what the system answered, such as a full disk, and call again once solved',
});

/**
 * @param option - the option the command needs
 * @param what - what its value is
 * @param hint - what to add; the option's own text when it has one, so a missing and an empty
 *   option name the same step
 * @returns the issue
 */
export const missingOption = (
  option: OptionName,
  what: string,
  hint = missingHint(option),
): Issue => ({
  code: 'MISSING_OPTION',
  path: option,
  message: `The command needs --${option}, ${what}`,
  hint,
});

/** The issue of an init without --cv; the command lists the names already taken. */
export const cvNameMissing = (): Issue => ({
  ...missingOption('cv', 'the name of the new CV', NEW_NAME),
  command: 'oriko show --cv',
});

// A missing folder and an empty one are both no CV; the message says which it is.
export const noCv = (home: string, exists: boolean): Issue => ({
  code: 'NO_CV',
  path: 'home',
  message: `The data folder ${shown(home)} ${exists ? 'holds no CV' : 'does not exist'}`,
  hint: 'Check --home, or run the command for the input of a new CV',
  command: 'oriko schema init',
});

// --cv without a value lists the CVs, so the command answers every name the caller may pass.
const LIST_CVS = 'oriko show --cv';

export const cvRequired = (): Issue => ({
  code: 'CV_REQUIRED',
  path: 'cv',
  message: 'The data folder holds several CVs and the call names none',
  hint: 'Run the command, then pass --cv with one of the CV names it lists',
  command: LIST_CVS,
});

export const unknownCvOfProfile = (name: string): Issue => ({
  code: 'UNKNOWN_CV',
  path: 'profile.cv',
  message: `The profile names the CV ${shown(name)}, which the data folder does not hold`,
  hint: 'Run the command and set the field cv of the profile to one of the CV names it lists',
  command: LIST_CVS,
});

export const unknownCv = (name: string): Issue => ({
  code: 'UNKNOWN_CV',
  path: 'cv',
  message: `The data folder has no CV ${shown(name)}`,
  hint: 'Run the command and use one of the CV names it lists',
  command: LIST_CVS,
});

export const cvMismatch = (explicit: string, fromProfile: string): Issue => ({
  code: 'CV_MISMATCH',
  path: 'cv',
  message: `--cv names ${shown(explicit)}, but the profile belongs to ${shown(fromProfile)}`,
  hint: 'Leave out --cv, or change the field cv of the profile',
});

export function unknownProfile(name: string, names: string[]): Issue {
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

export const roleTooLong = (role: string): Issue => ({
  code: 'ROLE_TOO_LONG',
  path: 'person.role',
  message: `The role ${shown(role)} takes more than one line beside the photo`,
  hint: 'Shorten the role, in the master or with "person.role" in the profile',
});

export const blockTooTall = (id: string, over: number): Issue => ({
  code: 'BLOCK_TOO_TALL',
  path: `blocks.${id}`,
  message: `The block ${id} is about ${over} pt higher than a page holds`,
  hint: 'Shorten the block, for example by removing items',
});

export const pageOverflow = (side: string, pages: number, late: string[]): Issue => ({
  code: 'PAGE_OVERFLOW',
  path: 'pages',
  message: `These blocks of the ${side} column land after page ${pages}: ${late.join(', ')}`,
  hint: `Hide or shorten blocks of the ${side} column, remove a page pin, or raise "pages"`,
});
