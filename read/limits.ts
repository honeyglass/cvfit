/**
 * The limits of oriko read on a Word file and a download.
 *
 * READ_LIMITS: the unpacked text of a Word file, and the redirects and time of one download.
 *
 * @example const signal = AbortSignal.timeout(READ_LIMITS.downloadSeconds * 1_000);
 */
export const READ_LIMITS = {
  /** The text inside a Word file once unpacked, which its ZIP may state falsely. */
  documentBytes: 5_000_000,
  /** The redirects one download may follow. */
  redirects: 5,
  /** The whole download, from the first connect to the last byte. */
  downloadSeconds: 20,
} as const;
