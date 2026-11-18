/**
 * The commands in a refusal and in the next steps, completed so each runs as it stands.
 *
 * withCommands: a refusal whose commands carry the --home of the call and the CV of a block list.
 * withNext: a success with the steps that follow it.
 * schemaCommand: the schema command for a command or shape, or the full schema.
 *
 * @example return { result: await withCommands(call, withNext(call, result)), asText };
 */
import { Rejection, done } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import { optionText } from '../core/options.ts';
import { chosenCv } from '../core/home.ts';
import { nextSteps } from './next.ts';
import { profileCv } from './cv.ts';
import { isSchemaName } from './route.ts';
import type { Call, Fields } from './types.ts';

export const schemaCommand = (command: string) =>
  isSchemaName(command) ? `oriko schema ${command}` : 'oriko schema';

/**
 * Completes the commands of a refusal, so each one runs as it stands.
 *
 * @param call - the call that was refused
 * @param result - its answer
 * @returns the answer, an unknown block given the command for the ids of this call's CV, and every
 *   command given the --home of this call
 */
export async function withCommands(call: Call, result: Result<Fields>): Promise<Result<Fields>> {
  if (result.error === null) return result;
  const blockCommand = await blockListCommand(call, result.error.issues);
  const home = homeArg(call);
  const issues = result.error.issues.map(issue => {
    const command =
      issue.code === 'UNKNOWN_BLOCK' ? (issue.command ?? blockCommand) : issue.command;
    return command === undefined ? issue : { ...issue, command: `${command}${home}` };
  });
  return { data: null, error: new Rejection(result.error.refusal, issues) };
}

// A success gets the steps that follow it, with this call's CV and data folder in each command.
export function withNext(call: Call, result: Result<Fields>): Result<Fields> {
  if (result.error !== null) return result;
  const steps = nextSteps({
    command: call.command,
    selector: selectorOf(call),
    data: result.data,
    isDryRun: call.values['dry-run'] === true,
  });
  if (steps.length === 0) return result;
  const home = homeArg(call);
  const next = steps.map(step =>
    step.command === undefined ? step : { ...step, command: `${step.command}${home}` },
  );
  return done({ ...result.data, next });
}

// Every selector of the call, never a pick: a profile without a CV needs the --cv beside it.
function selectorOf(call: Call) {
  const { profile, cv } = call.values;
  const ofProfile = profile === undefined ? '' : optionText('profile', profile);
  return cv === undefined ? ofProfile : `${ofProfile}${optionText('cv', cv)}`;
}

const homeArg = (call: Call) =>
  call.values.home === undefined ? '' : optionText('home', call.values.home);

async function blockListCommand(call: Call, issues: Issue[]) {
  if (issues.some(issue => issue.code === 'UNKNOWN_BLOCK') === false) return undefined;
  const cv = await chosenCv(call.home, call.values.cv, await profileCv(call));
  return cv.error === null ? `oriko show${optionText('cv', cv.data.name)} --block` : undefined;
}
