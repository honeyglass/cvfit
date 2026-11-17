/**
 * The cli in a test: a data folder with the reference CV, and a call that answers parsed JSON.
 *
 * workspace: a data folder with the reference CV 'jane' and two profiles, and a working directory.
 * call: runs oriko as a program reads it, and answers the exit code and the parsed answer.
 * terminal, piped: run oriko as a person at a terminal sees it, or as a program reads it, as text.
 * NEW_CV: the input of a second CV, 'erika'.
 *
 * @example const { exit, answer } = await call(workspace(), ['plan']);
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { run } from '../../cli/run.ts';
import { FIXTURE_URL, photo } from './fixture.ts';

const Answer = z.looseObject({
  ok: z.boolean(),
  issues: z
    .array(z.looseObject({ code: z.string(), path: z.string(), command: z.string().optional() }))
    .optional(),
  // A refusal says its next step in a sentence; a success lists its steps.
  next: z
    .union([
      z.string(),
      z.array(
        z.strictObject({
          does: z.string(),
          command: z.string().optional(),
          needs: z.array(z.string()).optional(),
        }),
      ),
    ])
    .optional(),
});

export type Space = { home: string; cwd: string };

export const workspace = (): Space => {
  const home = mkdtempSync(join(tmpdir(), 'oriko-home-'));
  const cwd = mkdtempSync(join(tmpdir(), 'oriko-cwd-'));
  mkdirSync(join(home, 'cvs'));
  const master = readFileSync(FIXTURE_URL, 'utf8').replace('"photo.png"', '"cvs/jane.png"');
  writeFileSync(join(home, 'cvs', 'jane.json'), master);
  writeFileSync(join(home, 'cvs', 'jane.png'), photo());
  mkdirSync(join(home, 'profiles'));
  writeFileSync(
    join(home, 'profiles', 'acme.json'),
    JSON.stringify({ cv: 'jane', blocks: { freelance: { hidden: true } } }),
  );
  writeFileSync(
    join(home, 'profiles', 'broken.json'),
    JSON.stringify({ blocks: { nobody: { hidden: true } } }),
  );
  return { home, cwd };
};

export const call = async ({ home, cwd }: Space, argv: string[], stdin: string | null = null) => {
  const { exit, out } = await ran({ home, cwd }, argv, stdin, false);
  const answer = Answer.parse(JSON.parse(out));
  return { exit, answer, codes: answer.issues?.map(issue => issue.code) ?? [] };
};

export const terminal = async (space: Space, argv: string[]) =>
  (await ran(space, argv, null, true)).out;

export const piped = async (space: Space, argv: string[]) =>
  (await ran(space, argv, null, false)).out;

async function ran({ home, cwd }: Space, argv: string[], stdin: string | null, isTTY: boolean) {
  let out = '';
  const exit = await run(argv, {
    home,
    cwd,
    isTTY,
    stdin: async () => stdin,
    write: text => (out += text),
  });
  return { exit, out };
}

export const NEW_CV = JSON.stringify({
  language: 'de',
  firstName: 'Erika',
  lastName: 'Muster',
  role: 'Entwicklerin',
});
