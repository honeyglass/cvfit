/**
 * The part of gws's answer to files create that oriko reads: the id of the new Google Doc.
 *
 * Created: the answer, other fields kept but unchecked.
 *
 * @example const created = Created.safeParse(JSON.parse(stdout));
 */
import { z } from 'zod';

export const Created = z.looseObject({
  id: z.string().regex(/^[\w-]+$/, 'Expected a Drive file id'),
});
