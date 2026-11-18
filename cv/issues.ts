/**
 * The issues the CV commands raise, each made by one function.
 *
 * cvExists: an init with the name of a CV the data folder already holds.
 *
 * @example if (names.includes(name)) return rejected('init', [issue.cvExists(name)]);
 */
import { shown } from '@honeyglass/utils/ts';
import type { Issue } from '../core/errors.ts';

export const cvExists = (name: string): Issue => ({
  code: 'CV_EXISTS',
  path: 'cv',
  message: `The data folder already holds a CV ${shown(name)}`,
  hint: 'Choose another name, or change that CV with cv update and the block commands',
});
