/**
 * A CV as text for the terminal, page by page, to pick a profile before it is built.
 *
 * preview: the pages of a plan as text, each page a framed sheet with its two columns.
 *
 * It shows what stands on which page, in which order, and how full each column is. It does not
 * show fonts or exact distances, and a drawn face stands where the photo is; those exist only
 * in the .docx.
 *
 * @example io.write(preview(cv, plan));
 */
import { LIMITS } from '../core/limits.ts';
import type { Block, Master } from '../data/cv.schema.ts';
import type { Column, Placed, Plan } from '../layout/place.ts';

const LEFT = 52;
const RIGHT = 25;
const DATE = 18;
const DOTS = LIMITS.level + 1;
/** The cells of a fill bar; one cell is a tenth of a column. */
const BAR = 10;
/** The placeholder for the photo: the terminal shows where it stands, never the picture. */
const FACE = ['   ╭───────╮', '   │  ◠ ◠  │', '   │   ‿   │', '   ╰───────╯'];
const FACE_WIDTH = 12;

/**
 * @param cv - a checked CV
 * @param plan - the plan place() made for this CV
 * @returns the text, one line per row of the terminal, every line 84 characters wide
 */
export function preview(cv: Master, plan: Plan) {
  const count = plan.pages.length;
  const sheets = plan.pages.map((page, index) => {
    const title = `Page ${index + 1} of ${count}`;
    const fill = `Left  ${bar(page.left)}     Right ${bar(page.right)}`;
    return sheet(title, leftLines(cv, page.left, index), rightLines(cv, page.right, index), fill).join('\n');
  });
  return `${sheets.join('\n\n')}\n`;
}

// One page as a sheet: a frame, the two columns, and below them how full each column is.
function sheet(title: string, left: string[], right: string[], fill: string) {
  const [leftRows, rightRows] = [withoutBlankEnd(left), withoutBlankEnd(right)];
  const rows = Math.max(leftRows.length, rightRows.length);
  const body = Array.from({ length: rows }, (_, row) => `│ ${(leftRows[row] ?? '').padEnd(LEFT)} │ ${(rightRows[row] ?? '').padEnd(RIGHT)} │`);
  return [
    `${`╭─ ${title} `.padEnd(LEFT + 3, '─')}┬${'─'.repeat(RIGHT + 2)}╮`,
    ...body,
    `├${'─'.repeat(LEFT + 2)}┴${'─'.repeat(RIGHT + 2)}┤`,
    `│ ${fill.padEnd(LEFT + RIGHT + 3)} │`,
    `╰${'─'.repeat(LEFT + RIGHT + 5)}╯`,
  ];
}

const withoutBlankEnd = (lines: string[]) => lines.slice(0, lines.findLastIndex(line => line !== '') + 1);

function bar(column: Column) {
  const share = column.used / (column.used + column.free);
  const cells = Math.min(BAR, Math.round(share * BAR));
  return `${'▰'.repeat(cells)}${'▱'.repeat(BAR - cells)} ${Math.round(share * 100)} % full`;
}

// Breaks at spaces; a word longer than the line is cut, so no line grows past the column.
function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ').flatMap(part => cut(part, width))) {
    const joined = line === '' ? word : `${line} ${word}`;
    if (joined.length <= width) {
      line = joined;
      continue;
    }
    lines.push(line);
    line = word;
  }
  return [...lines, line];
}

const cut = (word: string, width: number) => word.match(new RegExp(`.{1,${width}}`, 'gu')) ?? [''];

const blockOf = (cv: Master, placed: Placed) => cv.blocks.find(block => block.id === placed.id);

function leftLines(cv: Master, column: Column, page: number) {
  const top = page === 0 ? [...nameBlock(cv.person), ''] : [];
  return [...top, ...column.blocks.flatMap(placed => jobLines(cv, placed))];
}

// The face on the left, name and role right-aligned beside it, as the document sets them.
function nameBlock(person: Master['person']) {
  const room = LEFT - FACE_WIDTH;
  const beside = [person.firstName, person.lastName, person.role, ''];
  return FACE.map((line, row) => `${line}${shortened(beside[row] ?? '', room).padStart(room)}`);
}

const shortened = (text: string, width: number) => (text.length <= width ? text : `${text.slice(0, width - 1)}…`);

function jobLines(cv: Master, placed: Placed) {
  const job = blockOf(cv, placed);
  if (job?.kind !== 'job') return [];
  const body = LEFT - DATE;
  const heading = placed.heading === null ? [] : [...wrap(placed.heading.text.toUpperCase(), LEFT), ''];
  const head = wrap(`● ${job.title}`, body);
  const date = wrap(`${job.from} – ${job.to}`, DATE - 1);
  const employer = `${job.employer} · ${job.place}`;
  const details = [employer, ...job.bullets.map(bullet => `✓ ${bullet}`)].flatMap(line => hanging(line, body - 2));
  const rows = [...head, ...details.map(line => `│ ${line}`)];
  return [...heading, ...rows.map((row, index) => `${(date[index] ?? '').padEnd(DATE)}${row}`), ''];
}

// The lines after the first stand two characters in, below the text of a bullet.
const hanging = (text: string, width: number) => wrap(text, width - 2).map((line, index) => (index === 0 ? line : `  ${line}`));

function rightLines(cv: Master, column: Column, page: number) {
  const contact = cv.contact.items.flatMap(item => item.lines.flatMap(line => wrap(line, RIGHT)));
  const top = page === 0 ? [cv.contact.title.toUpperCase(), ...contact, ''] : [];
  return [...top, ...column.blocks.flatMap(placed => blockLines(cv, placed))];
}

function blockLines(cv: Master, placed: Placed) {
  const block = blockOf(cv, placed);
  if (block === undefined || block.kind === 'job') return [];
  const heading = placed.heading === null ? [] : wrap(placed.heading.text.toUpperCase(), RIGHT);
  const title = block.title === undefined ? [] : wrap(block.title, RIGHT);
  return [...heading, ...title, ...content(block), ''];
}

function content(block: Exclude<Block, { kind: 'job' }>) {
  switch (block.kind) {
    case 'rated':
      return block.items.map(item => `${item.name.slice(0, RIGHT - DOTS).padEnd(RIGHT - DOTS)} ${dots(item.level)}`);
    case 'list':
      return wrap(block.items.join(', '), RIGHT);
    case 'entries':
      return block.items.flatMap(item => [...wrap(item.title, RIGHT), ...wrap(item.note, RIGHT)]);
  }
}

const dots = (level: number) => '●'.repeat(level) + '○'.repeat(LIMITS.level - level);
