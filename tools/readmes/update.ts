/**
 * pnpm readmes: writes the facts of the code into every folder README, or checks that they stand.
 *
 * SKIP: the folders of this repository that get no README from the tool.
 * update: one run as the script does it, so a test can call it.
 *
 * Without arguments it writes; --check writes nothing and fails on any README that differs.
 * Either way it fails on every issue, and prints the gaps, the modules without a sentence, as
 * JSON on stdout for whoever writes the sentences.
 *
 * @example pnpm readmes --check
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readmes } from './readmes.ts';
import type { Gap } from './readmes.ts';

/** tests/ lists what the tests use itself; the others hold no code to describe yet. */
export const SKIP = ['assets', 'brand', 'docs', 'examples', 'tests'];

/** The arguments the script knows; any other one is refused, never ignored. */
const ARGUMENTS = new Set(['--check']);
const NO_GAPS: Gap[] = [];

/**
 * @param root - the repository root
 * @param args - the arguments of the call
 * @param skip - the top-level folders to leave out
 * @returns whether the run failed, one line per problem, and the modules without a sentence
 */
export function update(root: string, args: string[], skip: string[]) {
  const unknown = args.filter(arg => ARGUMENTS.has(arg) === false);
  if (unknown.length > 0)
    return {
      failed: true,
      messages: [`Unknown argument ${unknown.join(' ')}; only --check is known`],
      gaps: NO_GAPS,
    };
  const check = args.includes('--check');
  const { readmes: found, issues } = readmes(root, { skip });
  const stale = found.filter(readme => readme.wanted !== readme.current);
  if (check === false)
    for (const readme of stale) writeFileSync(join(root, readme.path), readme.wanted);
  const messages = [
    ...[...issues, ...found.flatMap(readme => readme.issues)].map(
      problem => `${problem.code} ${problem.path}: ${problem.message}`,
    ),
    ...(check ? stale.map(readme => `STALE ${readme.path}: run pnpm readmes to write it`) : []),
  ];
  return { failed: messages.length > 0, messages, gaps: found.flatMap(readme => readme.gaps) };
}

if (import.meta.main) {
  const result = update(
    fileURLToPath(new URL('../..', import.meta.url)),
    process.argv.slice(2),
    SKIP,
  );
  for (const message of result.messages) console.error(message);
  if (result.gaps.length > 0) console.log(JSON.stringify({ gaps: result.gaps }, null, 2));
  process.exitCode = result.failed ? 1 : 0;
}
