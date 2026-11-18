/**
 * The issues the profile commands raise, each made by one function.
 *
 * profileMissing: a profile command without --profile.
 * profileExists: a profile set over a stored profile without --replace.
 * unknownProfile: a profile show for a name with neither a profile nor a posting.
 *
 * @example if (name === undefined) return rejected(command, [issue.profileMissing(command)]);
 */
import { shown } from '@honeyglass/utils/ts';
import type { Issue } from '../core/errors.ts';
import * as coreIssue from '../core/issues.ts';
import { optionText } from '../core/options.ts';

export const profileMissing = (command: string): Issue => ({
  ...coreIssue.missingOption(
    'profile',
    'the name of the profile',
    'Run the command for the existing profiles, or pass a new name in lower-case words joined by hyphens',
  ),
  command: `oriko ${command} --profile`,
});

export const profileExists = (name: string): Issue => ({
  code: 'PROFILE_EXISTS',
  path: 'profile',
  message: `The profile ${shown(name)} is already stored`,
  hint: 'Run the command to see it; add --replace to overwrite it, or pass another --profile',
  command: `oriko profile show${optionText('profile', name)}`,
});

export const unknownProfile = (name: string): Issue => ({
  code: 'UNKNOWN_PROFILE',
  path: 'profile',
  message: `The data folder has no profile ${shown(name)}, nor a posting read for it`,
  hint: 'Run the command and use one of the profile names it lists',
  command: 'oriko plan --profile',
});
