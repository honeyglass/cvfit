/**
 * The JSON input of a command, from --json or from stdin.
 *
 * payload: the parsed input, refused when it is missing, too large, or no valid JSON.
 *
 * @example const input = await payload(call, 'init');
 */
import { trySync$ } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import * as coreIssue from '../core/issues.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { schemaCommand } from './complete.ts';
import type { Call } from './types.ts';

export async function payload(call: Call, command: string): Promise<Result<unknown>> {
  const raw = call.values.json ?? (await call.io.stdin());
  const isEmpty = raw === null || raw.trim() === '';
  if (isEmpty) return rejected(command, [missingInput(command)]);
  if (Buffer.byteLength(raw) > FILE_LIMITS.inputBytes)
    return rejected(command, [coreIssue.tooLarge('json')]);
  const value = trySync$((): unknown => JSON.parse(raw));
  if (value.error !== null)
    return rejected(command, [coreIssue.invalidJson('The input')], value.error);
  return done(value.data);
}

const missingInput = (command: string): Issue => ({
  ...coreIssue.missingOption('json', 'the input of the command'),
  code: 'MISSING_INPUT',
  hint: 'Run the command for the input shape, then pass it with --json or through stdin',
  command: schemaCommand(command),
});
