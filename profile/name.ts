/**
 * The name of a profile, checked before any path is built from it.
 *
 * profileName: the name a call gives, or a refusal when it is missing or no id.
 *
 * @example const name = profileName(request.name, 'profile set');
 */
import { done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import * as coreIssue from '../core/issues.ts';
import { Id } from '../core/cv.schema.ts';

// The name becomes a file name, so it passes the id pattern before any path is built from it.
export function profileName(name: string | undefined, command: string): Result<string> {
  if (name === undefined) return rejected(command, [profileMissing(command)]);
  const parsed = Id.safeParse(name);
  if (parsed.success === false)
    return rejected(command, coreIssue.schemaIssues(parsed.error, ['profile'], command));
  return done(parsed.data);
}

const profileMissing = (command: string): Issue => ({
  ...coreIssue.missingOption(
    'profile',
    'the name of the profile',
    'Run the command for the existing profiles, or pass a new name in lower-case words joined by hyphens',
  ),
  command: `oriko ${command} --profile`,
});
