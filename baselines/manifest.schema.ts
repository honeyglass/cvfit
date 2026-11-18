/**
 * The shape of google.json: each .docx of an example and the sha256 it had when Google set its PDF.
 *
 * Manifest: the file name of a .docx mapped to that hash, in lower-case hex.
 *
 * @example const manifest = Manifest.safeParse(JSON.parse(text));
 */
import { z } from 'zod';

export const Manifest = z.record(
  z.string().regex(/^[\w.-]+\.docx$/, 'Expected the file name of a .docx'),
  z.string().regex(/^[0-9a-f]{64}$/, 'Expected a sha256 in lower-case hex'),
);
export type Manifest = z.output<typeof Manifest>;
