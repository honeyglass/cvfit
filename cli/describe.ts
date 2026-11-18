/**
 * The command oriko schema: the commands, options and shapes a caller needs to find its way.
 *
 * schema: everything without a name, and one command or shape with one.
 *
 * @example return schema(call.rest.join(' '));
 */
import { shown } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import { ICONS, KINDS, LIMITS } from '../core/limits.ts';
import { OPTIONS } from '../core/options.ts';
import { COMMANDS, EVERYWHERE, SHAPES } from './commands.ts';
import type { Command } from './commands.ts';
import { isCommandName, isShapeName } from './route.ts';
import type { Fields } from './types.ts';

// Without a name: everything a caller needs to find its way. With one: a command or a shape.
export function schema(name: string): Result<Fields> {
  if (name === '') {
    const options = Object.fromEntries(
      Object.entries(OPTIONS).map(([key, spec]) => [key, spec.text]),
    );
    return done({
      commands: Object.keys(COMMANDS),
      options,
      schemas: Object.keys(SHAPES),
      kinds: KINDS,
      icons: ICONS,
      limits: LIMITS,
    });
  }
  if (isShapeName(name)) return done({ name, input: z.toJSONSchema(SHAPES[name]) });
  if (isCommandName(name) === false) return rejected('schema', [unknownSchema(name)]);
  const command: Command = COMMANDS[name];
  const options = Object.fromEntries(
    [...command.options, ...EVERYWHERE].map(option => [option, OPTIONS[option].text]),
  );
  const input = command.input === undefined ? null : z.toJSONSchema(command.input);
  return done({ name, does: command.does, options, words: command.words ?? [], input });
}

const unknownSchema = (name: string): Issue => ({
  code: 'UNKNOWN_COMMAND',
  path: 'name',
  message: `No command or shape is called ${shown(name)}`,
  hint: 'Run the command and use one of the commands or schemas it lists',
  command: 'oriko schema',
});
