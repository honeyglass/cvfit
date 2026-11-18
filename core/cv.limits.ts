/**
 * The block kinds, icons and sizes of a CV, which the CV schema and several features read.
 *
 * COLUMN, KINDS: every block kind and the column it lives in.
 * ICONS: the icons a contact line may use.
 * CV_LIMITS: the largest sizes a CV may have.
 *
 * @example const column = COLUMN[block.kind];
 */
export const COLUMN = { job: 'left', rated: 'right', list: 'right', entries: 'right' } as const;
export const KINDS = ['job', 'rated', 'list', 'entries'] as const;
export const ICONS = ['pin', 'home', 'phone', 'mail', 'globe'] as const;
export const CV_LIMITS = {
  level: 5,
  text: 300,
  items: 40,
  blocks: 60,
  pages: 4,
} as const;
