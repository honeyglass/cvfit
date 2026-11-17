/**
 * The next steps after a successful answer, so a person or an agent always sees where to go on.
 *
 * nextSteps: the steps that follow one answer, from the call and the facts of the answer.
 * Step: one step; its command runs as it stands, unless it names what it still needs.
 *
 * The cli only names a step and never follows one. A step without a command is for the person.
 *
 * @example const next = nextSteps({ command: 'plan', selector: ' --profile go-e', data, isDryRun });
 */
import { optionText } from './args.ts';
import { COMMANDS } from './commands.ts';
import type { CommandName } from './commands.ts';

export type Step = { does: string; command?: string; needs?: string[] };

type Facts = {
  command: CommandName | undefined;
  /** The --cv or --profile of the call, so a step works on the same CV. */
  selector: string;
  data: Record<string, unknown>;
  isDryRun: boolean;
};

const AGAIN: Step = { does: 'repeat the call without --dry-run to write' };
const UPLOAD: Step = { does: 'upload the .docx to Google Docs, then choose File, Download, PDF' };

/**
 * @param facts - the command of the call, its --cv or --profile, its answer, and --dry-run
 * @returns 0 to 3 steps, the main path first; none when nothing follows
 */
export function nextSteps(facts: Facts): Step[] {
  const { data, selector } = facts;
  if ('option' in data) return [];
  if (facts.isDryRun) return data.written === false ? [AGAIN] : [];
  switch (facts.command) {
    case undefined:
      return Array.isArray(data.cvs) ? startSteps(data) : [];
    case 'cvs':
      return cvsSteps(data.cvs);
    case 'profiles':
      return count(data.profiles) > 0
        ? [step('plan', '', ['profile'])]
        : [step('schema', ' profile')];
    case 'show':
      return data.block === undefined ? [step('show', selector, ['block'])] : [];
    case 'init':
      return [
        step('contact add', selector, ['json']),
        step('block add', selector, ['json']),
        step('photo set', selector, ['file']),
      ];
    case 'plan':
      return [step('preview', selector), step('build', selector, ['out'])];
    case 'preview':
    case 'photo set':
      return [step('build', selector, ['out'])];
    case 'build':
      return data.written === true ? [UPLOAD] : [];
    case 'schema':
      return [];
    default:
      return data.fits === true
        ? [step('preview', selector), step('build', selector, ['out'])]
        : [];
  }
}

const step = (name: CommandName, args = '', needs?: string[]): Step => {
  const command: { does: string } = COMMANDS[name];
  const base = { does: command.does, command: `oriko ${name}${args}` };
  return needs === undefined ? base : { ...base, needs };
};

// Where to start depends on what the data folder holds: no CV, CVs only, or CVs and profiles.
function startSteps(data: Record<string, unknown>): Step[] {
  if (count(data.cvs) === 0) return [step('init', '', ['cv', 'json']), step('schema')];
  if (count(data.profiles) === 0) return [step('cvs'), step('schema', ' profile')];
  return [step('profiles'), step('cvs')];
}

// With one CV the step names it; with several the caller picks one.
function cvsSteps(cvs: unknown): Step[] {
  const only = Array.isArray(cvs) && cvs.length === 1 ? nameOf(cvs[0]) : undefined;
  const show = only === undefined ? step('show', '', ['cv']) : step('show', optionText('cv', only));
  return [show, step('profiles')];
}

const count = (list: unknown) => (Array.isArray(list) ? list.length : 0);

const nameOf = (entry: unknown) =>
  typeof entry === 'object' && entry !== null && 'name' in entry && typeof entry.name === 'string'
    ? entry.name
    : undefined;
