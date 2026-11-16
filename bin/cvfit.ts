#!/usr/bin/env node
/**
 * The program `cvfit`: the cli wired to the real terminal.
 *
 * @example cvfit plan --profile acme
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import { run } from '../cli/run.ts';

process.exitCode = await run(process.argv.slice(2), {
  home: join(homedir(), '.cvfit'),
  cwd: process.cwd(),
  isTTY: process.stdout.isTTY === true,
  stdin: async () => (process.stdin.isTTY === true ? null : text(process.stdin)),
  write: output => process.stdout.write(output),
});
