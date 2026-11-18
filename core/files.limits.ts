/**
 * The largest input, photo and file oriko reads, which core/files.ts and the features share.
 *
 * FILE_LIMITS: the bytes the JSON input, a photo and a read file may have.
 *
 * @example const bytes = await readBounded(path, FILE_LIMITS.readBytes, 'home');
 */
export const FILE_LIMITS = {
  inputBytes: 1_000_000,
  photoBytes: 20_000_000,
  /** A posting, notes or an old CV as a file or a download. */
  readBytes: 10_000_000,
} as const;
