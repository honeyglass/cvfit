/**
 * The names and limits a caller may read before it builds input.
 *
 * COLUMN, KINDS: every block kind and the column it lives in.
 * ICONS: the icons a contact line may use.
 * LIMITS: the largest sizes the input may have.
 * EXIT: the exit codes of the cli.
 *
 * @example const column = COLUMN[block.kind];
 */
export const COLUMN = { job: 'left', rated: 'right', list: 'right', entries: 'right' } as const;
export const KINDS = ['job', 'rated', 'list', 'entries'] as const;
export const ICONS = ['pin', 'home', 'phone', 'mail', 'globe'] as const;
export const LIMITS = {
  level: 5,
  text: 300,
  items: 40,
  blocks: 60,
  pages: 4,
  inputBytes: 1_000_000,
  photoBytes: 20_000_000,
} as const;
export const EXIT = { ok: 0, expected: 1, fatal: 2 } as const;
