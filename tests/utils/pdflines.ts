/**
 * The text lines of a PDF with their baselines, so a test can lay two PDFs of one CV side by side.
 *
 * textLines: every line of text, page by page and column by column, with where it stands.
 * Line: one line, its baseline from the top of the page and its left and right end, in pt.
 *
 * Two programs cut a line into pieces of text differently, so the pieces of one baseline join.
 *
 * @example const lines = await textLines(readFileSync('cv.pdf'), 425);
 */
import { getDocumentProxy } from 'unpdf';

export type Line = {
  page: number;
  column: number;
  y: number;
  x: number;
  end: number;
  text: string;
};

/**
 * @param bytes - the PDF
 * @param columnEdge - where the right column starts, in pt; a page without columns has none
 * @returns the lines, sorted by page, column and baseline; spaces are left out of the text
 */
export async function textLines(bytes: Uint8Array, columnEdge = Infinity) {
  const document = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0 });
  const lines: Line[] = [];
  for (let page = 1; page <= document.numPages; page++) {
    const sheet = await document.getPage(page);
    const height = sheet.view[3] ?? 0;
    const pieces: Line[] = [];
    for (const item of (await sheet.getTextContent()).items) {
      if ('str' in item === false || item.str.trim() === '') continue;
      const [, , , , x = 0, y = 0] = item.transform;
      const text = item.str.replace(/\s+/g, '');
      pieces.push({
        page,
        column: x < columnEdge ? 0 : 1,
        y: height - y,
        x,
        end: x + item.width,
        text,
      });
    }
    for (const piece of pieces.sort((a, b) => a.x - b.x)) joined(lines, piece);
  }
  return lines.sort((a, b) => a.page - b.page || a.column - b.column || a.y - b.y);
}

// Rows of a CV stand at least 12 pt apart, so pieces within 1 pt share a baseline. The pieces
// come from left to right, so each one joins at the end.
function joined(lines: Line[], piece: Line) {
  const line = lines.find(
    other =>
      other.page === piece.page && other.column === piece.column && Math.abs(other.y - piece.y) < 1,
  );
  if (line === undefined) {
    lines.push(piece);
    return;
  }
  line.text += piece.text;
  line.end = Math.max(line.end, piece.end);
}
