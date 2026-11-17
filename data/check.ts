/**
 * The gate for a master file and a profile: nothing else in the package reads unchecked data.
 *
 * check: the CV to build, with the profile applied and the hidden blocks left out.
 * schemaIssues: the issues of a failed schema check, each with its path.
 *
 * @example const cv = check(JSON.parse(masterText), JSON.parse(profileText));
 */
import { shown } from '@honeyglass/utils/ts';
import type { z } from 'zod';
import { done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import { COLUMN } from '../core/limits.ts';
import { Block, Master, PATCH, Profile } from './cv.schema.ts';

/**
 * Checks in layers: the shape first, then the profile, then the rules between blocks.
 *
 * @param master - the parsed master file
 * @param profile - the parsed profile of one job posting, or nothing
 * @returns the CV to build, or every issue of the first layer that failed
 */
export function check(master: unknown, profile?: unknown): Result<Master> {
  const parsed = Master.safeParse(master);
  if (parsed.success === false) return rejected('check', schemaIssues(parsed.error, [], 'master'));
  const duplicates = duplicateIds(parsed.data.blocks);
  if (duplicates.length > 0) return rejected('check', duplicates);
  const resolved = applyProfile(parsed.data, profile);
  if (resolved.error !== null) return resolved;
  const lonely = untitledBesideSection(resolved.data.blocks);
  if (lonely.length > 0) return rejected('check', lonely);
  return resolved;
}

/**
 * @param error - the error of a failed safeParse
 * @param prefix - the path of the checked value inside the input
 * @param name - the schema to point the caller to
 * @returns one issue per schema issue
 */
export function schemaIssues(error: z.ZodError, prefix: PropertyKey[], name: string): Issue[] {
  return error.issues.map(issue => ({
    code: 'SCHEMA',
    path: [...prefix, ...issue.path].join('.'),
    message: issue.message,
    hint: 'Run the command for the accepted shape',
    command: `oriko schema ${name}`,
  }));
}

function duplicateIds(blocks: Block[]) {
  const seen = new Set<string>();
  const issues: Issue[] = [];
  for (const block of blocks) {
    if (seen.has(block.id)) issues.push(duplicateId(block.id));
    seen.add(block.id);
  }
  return issues;
}

export const duplicateId = (id: string): Issue => ({
  code: 'DUPLICATE_ID',
  path: `blocks.${id}`,
  message: `Two blocks have the id ${shown(id)}`,
  hint: 'Give every block its own id',
});

// The cli adds the command that lists the block ids, as only it knows the name of the CV.
export const unknownBlock = (id: string, path: string): Issue => ({
  code: 'UNKNOWN_BLOCK',
  path,
  message: `No block has the id ${shown(id)}`,
  hint: 'Run the command and use one of the block ids it lists',
});

function applyProfile(master: Master, value: unknown): Result<Master> {
  if (value === undefined) return done(withoutHidden(master, master.blocks));
  const parsed = Profile.safeParse(value);
  if (parsed.success === false) return rejected('check', schemaIssues(parsed.error, [], 'profile'));
  const profile = parsed.data;
  const issues = unknownIds(master, profile);
  const blocks = master.blocks.map(block => patched(block, profile.blocks?.[block.id], issues));
  if (issues.length > 0) return rejected('check', issues);
  const person = { ...master.person, ...profile.person };
  return done(withoutHidden({ ...master, person }, ordered(blocks, profile.order ?? [])));
}

function unknownIds(master: Master, profile: Profile) {
  const known = new Set(master.blocks.map(block => block.id));
  const issues: Issue[] = [];
  for (const id of Object.keys(profile.blocks ?? {})) {
    if (known.has(id) === false) issues.push(unknownBlock(id, `blocks.${id}`));
  }
  for (const [index, id] of (profile.order ?? []).entries()) {
    if (known.has(id) === false) issues.push(unknownBlock(id, `order.${index}`));
  }
  return issues;
}

/**
 * A block with a patch laid over it; a null in the patch removes the field.
 *
 * @param block - the block of the master file
 * @param patch - the unchecked fields to replace, or nothing
 * @param issues - collects what is wrong with the patch
 * @returns the patched block, or the block as it was when the patch is refused
 */
export function patched(block: Block, patch: unknown, issues: Issue[]) {
  if (patch === undefined) return block;
  const fields = PATCH[block.kind].safeParse(patch);
  if (fields.success === false) {
    issues.push(...schemaIssues(fields.error, ['blocks', block.id], 'block'));
    return block;
  }
  const kept = Object.entries({ ...block, ...fields.data }).filter(([, value]) => value !== null);
  const merged = Block.safeParse(Object.fromEntries(kept));
  if (merged.success) return merged.data;
  issues.push(...schemaIssues(merged.error, ['blocks', block.id], 'block'));
  return block;
}

function ordered(blocks: Block[], order: string[]) {
  const first = order.flatMap(id => blocks.filter(block => block.id === id));
  return [...first, ...blocks.filter(block => order.includes(block.id) === false)];
}

const withoutHidden = (master: Master, blocks: Block[]): Master => ({
  ...master,
  blocks: blocks.filter(block => block.hidden !== true),
});

// A block without a title sits right below its section heading, so no second block fits beside it.
function untitledBesideSection(blocks: Block[]) {
  const right = blocks.filter(block => COLUMN[block.kind] === 'right');
  const issues: Issue[] = [];
  for (const [index, block] of right.entries()) {
    const neighbours = [right[index - 1], right[index + 1]];
    const shared = neighbours.some(neighbour => neighbour?.section === block.section);
    const isUntitled = block.kind !== 'job' && block.title === undefined;
    if (isUntitled && shared) issues.push(untitledNotAlone(block.id));
  }
  return issues;
}

const untitledNotAlone = (id: string): Issue => ({
  code: 'UNTITLED_NOT_ALONE',
  path: `blocks.${id}`,
  message: `The block ${shown(id)} has no title but shares its section with a block next to it`,
  hint: 'Give the block a title, or make it the only block of its section',
});
