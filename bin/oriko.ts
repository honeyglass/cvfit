#!/usr/bin/env node
/**
 * The program `oriko`: the cli wired to the real terminal.
 *
 * @example oriko plan --profile acme
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { LIMITS } from '../core/limits.ts';
import { pipedText } from '../cli/files.ts';
import { run } from '../cli/run.ts';

process.exitCode = await run(process.argv.slice(2), {
  home: join(homedir(), '.oriko'),
  cwd: process.cwd(),
  isTTY: process.stdout.isTTY === true,
  stdin: async () =>
    process.stdin.isTTY === true ? null : pipedText(process.stdin, LIMITS.inputBytes),
  write: output => process.stdout.write(output),
});
