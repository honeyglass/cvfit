/**
 * The estimated height of a block, from its text alone.
 *
 * lineCount: the lines a text takes in a given width.
 * blockHeight: the height of a block without its section heading, in pt.
 * contactHeight: the height of the contact block at the top of the first page, in pt.
 * spacedRole, roleLines: the role below the name as the document writes it, and its lines.
 *
 * Nothing here can ask Google Docs how high a line is. The glyph widths are those of Open Sans
 * and the line heights those of the reference PDF, which the tests check against that PDF.
 *
 * @example const lines = lineCount('Angular, React, Signals', 157);
 */
import type { Block, Master } from './cv.schema.ts';
import { LINE, SPACE, WIDTH, pt } from './metrics.ts';

/** Advance widths of Open Sans Regular, in thousandths of the font size. */
const GLYPH: Record<string, number> = {
  ' ': 260,
  a: 556,
  b: 613,
  c: 476,
  d: 613,
  e: 562,
  f: 339,
  g: 548,
  h: 614,
  i: 253,
  j: 253,
  k: 525,
  l: 253,
  m: 930,
  n: 614,
  o: 604,
  p: 613,
  q: 613,
  r: 408,
  s: 477,
  t: 353,
  u: 614,
  v: 501,
  w: 778,
  x: 524,
  y: 504,
  z: 468,
  A: 633,
  B: 648,
  C: 631,
  D: 729,
  E: 556,
  F: 516,
  G: 728,
  H: 739,
  I: 279,
  J: 267,
  K: 614,
  L: 519,
  M: 903,
  N: 754,
  O: 779,
  P: 602,
  Q: 779,
  R: 618,
  S: 549,
  T: 553,
  U: 728,
  V: 595,
  W: 926,
  X: 577,
  Y: 560,
  Z: 571,
  0: 571,
  1: 571,
  2: 571,
  3: 571,
  4: 571,
  5: 571,
  6: 571,
  7: 571,
  8: 571,
  9: 571,
  ',': 245,
  '.': 266,
  ':': 266,
  ';': 266,
  '-': 322,
  '/': 367,
  '(': 296,
  ')': 296,
  '&': 729,
  '+': 571,
};
/** Wider than most letters, so an unknown character never makes a text look shorter than it is. */
const UNKNOWN_GLYPH = 650;
const WEIGHT = { regular: 1, bold: 1.07, light: 0.97 } as const;
const FONT_SIZE = 10;

const TEXT_WIDTH = pt(WIDTH.right - WIDTH.indent - WIDTH.textRight);
const RATED_NAME_WIDTH = pt(WIDTH.ratedName - WIDTH.indent);
const DETAIL_WIDTH = pt(WIDTH.jobTitle + WIDTH.jobDate);

function textWidth(text: string, weight: keyof typeof WEIGHT) {
  let units = 0;
  for (const char of text) units += GLYPH[char] ?? UNKNOWN_GLYPH;
  return (units / 1000) * FONT_SIZE * WEIGHT[weight];
}

/**
 * Lines break at spaces only, as Google Docs breaks them; a word wider than the line breaks inside.
 *
 * @param text - one paragraph
 * @param width - the width of the line, in pt
 * @param weight - the weight of the font
 * @returns the number of lines, at least one
 */
export function lineCount(text: string, width: number, weight: keyof typeof WEIGHT = 'regular') {
  const space = textWidth(' ', weight);
  let lines = 1;
  let x = 0;
  for (const word of text.split(' ')) {
    const wide = textWidth(word, weight);
    const joined = x === 0 ? wide : x + space + wide;
    const wraps = x > 0 && joined > width;
    if (wraps) lines += 1;
    x = wraps ? wide : joined;
    const inside = Math.max(0, Math.ceil(x / width) - 1);
    lines += inside;
    x -= inside * width;
  }
  return lines;
}

/**
 * @param block - a block of any kind
 * @returns its height from the first spacing to the last line, in pt
 */
export function blockHeight(block: Block) {
  switch (block.kind) {
    case 'job':
      return jobHeight(block);
    case 'rated':
      return titleHeight(block.title) + ratedHeight(block.items);
    case 'list':
      return titleHeight(block.title) + LINE.body * lineCount(block.items.join(', '), TEXT_WIDTH);
    case 'entries':
      return titleHeight(block.title) + entriesHeight(block.items);
  }
}

// The date shares the title's line and the place the employer's line, so neither adds a line.
function jobHeight(job: Extract<Block, { kind: 'job' }>) {
  const titleLines = lineCount(job.title, pt(WIDTH.jobTitle - WIDTH.jobIndent), 'bold');
  const employerLines = lineCount(
    `${job.employer} · ${job.place}`,
    DETAIL_WIDTH - pt(WIDTH.jobIndent),
  );
  let bulletLines = 0;
  for (const bullet of job.bullets)
    bulletLines += lineCount(bullet, DETAIL_WIDTH - pt(WIDTH.bulletIndent));
  const head = pt(SPACE.jobGap) + LINE.wide * titleLines + pt(SPACE.afterJobTitle);
  return head + LINE.body * (employerLines + bulletLines) + pt(SPACE.afterEmployer);
}

function titleHeight(title: string | undefined) {
  if (title === undefined) return 0;
  return (
    pt(SPACE.beforeTitle) + LINE.body * lineCount(title, TEXT_WIDTH, 'bold') + pt(SPACE.afterTitle)
  );
}

function ratedHeight(items: { name: string }[]) {
  const dots = LINE.dots + pt(SPACE.ratedPad);
  let height = 0;
  for (const item of items) {
    const name = LINE.body * lineCount(item.name, RATED_NAME_WIDTH) + pt(SPACE.ratedPad);
    height += Math.max(name, dots);
  }
  return height;
}

function entriesHeight(items: { title: string; note: string }[]) {
  let height = pt(SPACE.entryGap) * (items.length - 1);
  for (const item of items) {
    const lines = lineCount(item.title, TEXT_WIDTH, 'bold') + lineCount(item.note, TEXT_WIDTH);
    height += LINE.body * lines + pt(SPACE.afterEntryTitle);
  }
  return height;
}

/**
 * Google Docs ignores letter spacing, so the role is spaced out with real spaces.
 *
 * @param role - the role of the person
 * @returns the role with a space between letters and four between words
 */
export const spacedRole = (role: string) =>
  role
    .split(' ')
    .map(word => [...word].join(' '))
    .join('    ');

const ROLE_FONT_SIZE = 8;

/**
 * Every letter of the spaced role is a word, so a role too wide breaks inside a word.
 *
 * @param role - the role of the person
 * @returns the lines the role takes beside the photo
 */
export function roleLines(role: string) {
  const width = pt(WIDTH.name - WIDTH.nameRight) * (FONT_SIZE / ROLE_FONT_SIZE);
  return lineCount(spacedRole(role), width, 'light');
}

/**
 * @param contact - the contact lines of the master file
 * @returns the height from the top of the column to the last contact row, in pt
 */
export function contactHeight(contact: Master['contact']) {
  const lineWidth = pt(WIDTH.right - WIDTH.contactIcon);
  let height = pt(SPACE.rightTop) + LINE.heading + pt(SPACE.afterContactHeading);
  for (const item of contact.items) {
    let lines = 0;
    for (const line of item.lines) lines += lineCount(line, lineWidth);
    height += LINE.body * lines + pt(SPACE.afterContactRow);
  }
  return height;
}
