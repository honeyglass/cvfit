/**
 * The credits: the tool that made the CV and its author, on the right of the last page.
 *
 * REPOSITORY: where oriko lives, as the credits name it and the terminal look links it.
 * withCredits: the CV with the credits as its last block, pinned to the last page.
 *
 * The credits stand only in the terminal look, and only when a call asks for them; no CV or
 * profile file holds them.
 *
 * @example const credited = withCredits(cv, plan.pages.length);
 */
import type { Block, Master } from './cv.schema.ts';

export const REPOSITORY = 'github.com/honeyglass/oriko';

/**
 * @param cv - a checked CV
 * @param lastPage - the last page the CV fills without the credits
 * @returns the CV with the credits after every other block
 */
export function withCredits(cv: Master, lastPage: number): Master {
  const credits = {
    id: 'oriko-credits',
    kind: 'entries',
    section: 'Made with',
    page: lastPage,
    items: [{ title: `This CV was made with ${REPOSITORY}`, note: 'Author: Serkan Sipahi' }],
  } satisfies Block;
  return { ...cv, blocks: [...cv.blocks, credits] };
}
