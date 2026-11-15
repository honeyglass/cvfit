/**
 * Every file the cli reads or writes, and the checks that keep a path where it belongs.
 *
 * readJson: the value of a JSON file.
 * isMissing, fileNotFound, tooLarge, invalidJson, missingOption: the expected failures of a file, as issues.
 * photoBytes: the photo a master file or a profile names, from the data folder only.
 * outputPath: the path of the .docx to write, inside the working directory only.
 * writeAtomic: a file written whole or not at all.
 *
 * A master file or a profile may come from an agent that read a job posting. A path inside it
 * therefore opens nothing outside the data folder, also not through a link.
 *
 * @example const master = await readJson(masterPath(home), 'home');
 */
import { readFile, realpath, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { $try, shown, trySync$ } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import { LIMITS } from '../core/limits.ts';

export const isMissing = (error: Error) => 'code' in error && error.code === 'ENOENT';

/**
 * @param path - the absolute path of the file
 * @param option - the cli option that named the file, for the hint
 * @returns the parsed value, unchecked
 */
export async function readJson(path: string, option: string): Promise<Result<unknown>> {
  const text = await $try(readFile(path, 'utf8'), { or: null, expected: isMissing });
  if (text === null) return rejected('read', [fileNotFound(path, option)]);
  if (Buffer.byteLength(text) > LIMITS.inputBytes) return rejected('read', [tooLarge(option)]);
  const value = trySync$((): unknown => JSON.parse(text));
  if (value.error !== null)
    return rejected('read', [invalidJson(`The file ${shown(path)}`)], value.error);
  return done(value.data);
}

export const fileNotFound = (path: string, option: string): Issue => ({
  code: 'FILE_NOT_FOUND',
  path: option,
  message: `There is no file ${shown(path)}`,
  hint: 'Check the path; "oriko schema" lists where each file is looked for',
});

export const tooLarge = (path: string): Issue => ({
  code: 'INPUT_TOO_LARGE',
  path,
  message: `The input is larger than ${LIMITS.inputBytes} bytes`,
  hint: 'Send less; a CV is a few thousand bytes',
});

export const invalidJson = (what: string): Issue => ({
  code: 'INVALID_JSON',
  path: '',
  message: `${what} is not valid JSON`,
  hint: 'Send one valid JSON value',
});

/**
 * @param folder - the data folder
 * @param photo - the path the master file or the profile names, relative to that folder
 * @returns the bytes of the photo
 */
export async function photoBytes(folder: string, photo: string): Promise<Result<Uint8Array>> {
  const path = resolve(folder, photo);
  if (leaves(folder, path)) return rejected('read', [pathOutside('person.photo', photo, folder)]);
  const real = await $try(realpath(path), { or: null, expected: isMissing });
  if (real === null) return rejected('read', [fileNotFound(path, 'person.photo')]);
  if (leaves(await realpath(folder), real))
    return rejected('read', [pathOutside('person.photo', photo, folder)]);
  return done(await readFile(real));
}

/**
 * @param cwd - the working directory
 * @param out - the path the caller named, or nothing
 * @returns the absolute path to write the .docx to
 */
export async function outputPath(cwd: string, out: string | undefined): Promise<Result<string>> {
  if (out === undefined)
    return rejected('build', [missingOption('out', 'the path of the .docx to write')]);
  if (out.endsWith('.docx') === false) return rejected('build', [wrongExtension(out)]);
  const path = resolve(cwd, out);
  if (leaves(cwd, path)) return rejected('build', [pathOutside('out', out, cwd)]);
  const parent = await $try(realpath(dirname(path)), { or: null, expected: isMissing });
  if (parent === null) return rejected('build', [fileNotFound(dirname(path), 'out')]);
  const real = await realpath(cwd);
  const isInside = parent === real || leaves(real, parent) === false;
  if (isInside === false) return rejected('build', [pathOutside('out', out, cwd)]);
  return done(path);
}

// True for the folder itself too: the check is for a file in the folder, never for the folder.
function leaves(folder: string, path: string) {
  const fromFolder = relative(folder, path);
  return fromFolder === '' || fromFolder.startsWith('..') || isAbsolute(fromFolder);
}

const pathOutside = (option: string, path: string, folder: string): Issue => ({
  code: 'PATH_OUTSIDE',
  path: option,
  message: `The path ${shown(path)} leaves the folder ${shown(folder)}`,
  hint: 'Use a path inside that folder, without a link that leads out of it',
});

export const missingOption = (option: string, what: string): Issue => ({
  code: 'MISSING_OPTION',
  path: option,
  message: `The command needs --${option}, ${what}`,
  hint: `Add --${option}`,
});

const wrongExtension = (out: string): Issue => ({
  code: 'WRONG_EXTENSION',
  path: 'out',
  message: `The output ${shown(out)} is no .docx file`,
  hint: 'Use a file name that ends in .docx',
});

/**
 * @param path - the absolute path of the file
 * @param content - the whole new content
 */
export async function writeAtomic(path: string, content: string | Uint8Array) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, path);
}
