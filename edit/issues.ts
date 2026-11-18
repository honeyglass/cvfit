/**
 * The issues the edit commands raise, each made by one function.
 *
 * unknownCommand: a command name the edit commands do not know.
 * nothingToDo, bothAnchors, otherColumn: a block move that names no place or a wrong anchor.
 * outOfRange: an index past the end of a list.
 *
 * @example if (index > last) return rejected(step, [issue.outOfRange('index', index, last)]);
 */
import { shown } from '@honeyglass/utils/ts';
import type { Issue } from '../core/errors.ts';
import { COMMANDS } from './apply.ts';

export const unknownCommand = (command: string): Issue => ({
  code: 'UNKNOWN_COMMAND',
  path: '',
  message: `There is no command ${shown(command)}`,
  hint: `Use one of: ${COMMANDS.join(', ')}`,
});

export const nothingToDo = (): Issue => ({
  code: 'NOTHING_TO_DO',
  path: '',
  message: 'The input names no new place for the block',
  hint: 'Send at least one of "before", "after" or "page"',
});

export const bothAnchors = (): Issue => ({
  code: 'BOTH_ANCHORS',
  path: 'after',
  message: 'The input names two anchors',
  hint: 'Send "before" or "after", not both',
});

export const otherColumn = (
  id: string,
  anchor: string,
  column: string,
  path: string,
  others: string[],
): Issue => ({
  code: 'OTHER_COLUMN',
  path,
  message: `The block ${shown(id)} stands in the ${column} column, the anchor ${shown(anchor)} does not`,
  hint: `Use an anchor of the ${column} column: ${others.join(', ')}`,
});

export const outOfRange = (path: string, index: number, last: number): Issue => ({
  code: 'INDEX_OUT_OF_RANGE',
  path,
  message: `There is no place ${index} in this list`,
  hint: last < 0 ? 'The list is empty; add an item first' : `Use an index from 0 to ${last}`,
});
