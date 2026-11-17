/**
 * Text from a document as one sure form: lines, and on each only characters that show as themselves.
 *
 * cleanText: the text with every other character a space, and how many there were.
 *
 * The text is stored as Markdown that an agent reads later, so no character may hide in it or
 * forge a line. UNSAFE_CHAR is an allow-list; a character nobody planned for becomes a space too.
 *
 * @example const { text, replaced } = cleanText(raw);
 */
import { UNSAFE_CHAR } from '@honeyglass/utils/ts';

const UNSAFE_CHARS = new RegExp(UNSAFE_CHAR, 'gu');

/**
 * @param raw - the text as a document gave it
 * @returns the text, trimmed, with at most one empty line in a row, and the count of replaced characters
 */
export function cleanText(raw: string) {
  let replaced = 0;
  const lines = raw.split(/\r\n|\r|\n/).map(line =>
    line
      .replace(UNSAFE_CHARS, () => {
        replaced += 1;
        return ' ';
      })
      .replace(/ {2,}/g, ' ')
      .trim(),
  );
  const text = lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text, replaced };
}
