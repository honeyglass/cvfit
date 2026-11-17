/**
 * The names and limits a caller may read before it builds input.
 *
 * COLUMN, KINDS: every block kind and the column it lives in.
 * ICONS: the icons a contact line may use.
 * STYLES: the looks build can give the file.
 * LIMITS: the largest sizes the input may have.
 * EXIT: the exit codes of the cli.
 *
 * @example const column = COLUMN[block.kind];
 */
export const COLUMN = { job: 'left', rated: 'right', list: 'right', entries: 'right' } as const;
export const KINDS = ['job', 'rated', 'list', 'entries'] as const;
export const ICONS = ['pin', 'home', 'phone', 'mail', 'globe'] as const;
export const STYLES = ['classic', 'terminal'] as const;
export const LIMITS = {
  level: 5,
  text: 300,
  items: 40,
  blocks: 60,
  pages: 4,
  inputBytes: 1_000_000,
  photoBytes: 20_000_000,
  /** A posting, notes or an old CV as a file or a download. */
  readBytes: 10_000_000,
  /** The text inside a Word file once unpacked, which its ZIP may state falsely. */
  documentBytes: 5_000_000,
  /** The redirects one download may follow. */
  redirects: 5,
  /** The whole download, from the first connect to the last byte. */
  downloadSeconds: 20,
  /** One run of LibreOffice; its first run on a system sets up its profile and takes longest. */
  pdfSeconds: 120,
} as const;
export const EXIT = { ok: 0, expected: 1, fatal: 2 } as const;
