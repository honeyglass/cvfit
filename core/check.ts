/**
 * The gate for a master file and a profile: nothing else in the package reads unchecked data.
 *
 * check: the CV to build, with the profile applied and the hidden blocks left out.
 *
 * @example const cv = check(JSON.parse(masterText), JSON.parse(profileText));
 */
import { done, rejected } from './errors.ts';
import type { Issue, Result } from './errors.ts';
import * as issue from './issues.ts';
import { COLUMN } from './cv.limits.ts';
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
  if (parsed.success === false)
    return rejected('check', issue.schemaIssues(parsed.error, [], 'master'));
  const duplicates = duplicateIds(parsed.data.blocks);
  if (duplicates.length > 0) return rejected('check', duplicates);
  const resolved = applyProfile(parsed.data, profile);
  if (resolved.error !== null) return resolved;
  const lonely = untitledBesideSection(resolved.data.blocks);
  if (lonely.length > 0) return rejected('check', lonely);
  return resolved;
}

function duplicateIds(blocks: Block[]) {
  const seen = new Set<string>();
  const issues: Issue[] = [];
  for (const block of blocks) {
    if (seen.has(block.id)) issues.push(issue.duplicateId(block.id));
    seen.add(block.id);
  }
  return issues;
}

function applyProfile(master: Master, value: unknown): Result<Master> {
  if (value === undefined) return done(withoutHidden(master, master.blocks));
  const parsed = Profile.safeParse(value);
  if (parsed.success === false)
    return rejected('check', issue.schemaIssues(parsed.error, [], 'profile'));
  const profile = parsed.data;
  const issues = unknownIds(master, profile);
  const blocks = master.blocks.map(block => patched(block, profile.blocks?.[block.id], issues));
  issues.push(...itemsNotInMaster(master.blocks, blocks));
  if (issues.length > 0) return rejected('check', issues);
  const person = { ...master.person, ...profile.person };
  return done(withoutHidden({ ...master, person }, ordered(blocks, profile.order ?? [])));
}

function unknownIds(master: Master, profile: Profile) {
  const known = new Set(master.blocks.map(block => block.id));
  const issues: Issue[] = [];
  for (const id of Object.keys(profile.blocks ?? {})) {
    if (known.has(id) === false) issues.push(issue.unknownBlock(id, `blocks.${id}`));
  }
  for (const [index, id] of (profile.order ?? []).entries()) {
    if (known.has(id) === false) issues.push(issue.unknownBlock(id, `order.${index}`));
  }
  return issues;
}

/**
 * The list items a profile adds, since a profile may drop and reorder items but never claim new ones.
 *
 * Jobs and entries stay free, as a profile may shorten or reword their text.
 *
 * @param master - the blocks of the master file
 * @param blocks - the same blocks with the profile laid over them, in the same order
 * @returns one issue per list block that holds an item the master does not
 */
function itemsNotInMaster(master: Block[], blocks: Block[]) {
  return master.flatMap((block, index) => {
    const result = blocks[index];
    if (block.kind !== 'list' || result?.kind !== 'list') return [];
    const added = result.items.filter(item => block.items.includes(item) === false);
    return added.length === 0 ? [] : [issue.itemsNotInMaster(block.id, added)];
  });
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
    issues.push(...issue.schemaIssues(fields.error, ['blocks', block.id], 'block'));
    return block;
  }
  const kept = Object.entries({ ...block, ...fields.data }).filter(([, value]) => value !== null);
  const merged = Block.safeParse(Object.fromEntries(kept));
  if (merged.success) return merged.data;
  issues.push(...issue.schemaIssues(merged.error, ['blocks', block.id], 'block'));
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
    if (isUntitled && shared) issues.push(issue.untitledNotAlone(block.id));
  }
  return issues;
}
