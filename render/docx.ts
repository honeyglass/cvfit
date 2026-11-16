/**
 * The .docx of a CV: tables with invisible borders, one page table per page of the plan.
 *
 * render: the bytes of the .docx for a checked CV and its plan.
 *
 * Google Docs drops or misplaces floating shapes, so every position is a table cell, and each
 * page is its own table: the plan decides what stands on a page, never the text flow.
 *
 * @example const docx = await render(cv, plan, readFileSync('photo.png'));
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { trySync$ } from '@honeyglass/utils/ts';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  LevelFormat,
  LineRuleType,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from 'docx';
import type { IParagraphOptions, IRunOptions, ITableCellOptions, ParagraphChild } from 'docx';
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import { ICONS, LIMITS } from '../core/limits.ts';
import type { Block, Master } from '../data/cv.schema.ts';
import { spacedRole } from '../layout/measure.ts';
import { HEIGHT, SPACE, WIDTH } from '../layout/metrics.ts';
import type { Column, Heading, Placed, Plan } from '../layout/place.ts';
import { circlePhoto, solidPng } from './images.ts';
import { stable } from './zip.ts';

const COLOR = {
  text: '262626',
  black: '000000',
  bar: '595959',
  line: 'A6A6A6',
  dotOn: '404040',
  dotOff: 'D8D8D8',
};
const FONT = { sans: 'Open Sans', light: 'Open Sans Light', head: 'Calibri', symbol: 'Arial' };
/** The edge length of each contact icon, in pt. */
const ICON_SIZE = { pin: 9.64, home: 9.64, phone: 7.94, mail: 8.79, globe: 7.94 } as const;
const ASSETS = join(import.meta.dirname, '..', 'assets');
const JOB_COLUMNS = [WIDTH.date, WIDTH.rail, WIDTH.rail, WIDTH.jobTitle, WIDTH.place];
const NAME_COLUMNS = [754, 1190, 1190, WIDTH.name];
const GUTTER = WIDTH.page - WIDTH.left - WIDTH.right;

type Images = {
  photo: Uint8Array;
  bar: Uint8Array;
  jobPin: Uint8Array;
  icons: Record<(typeof ICONS)[number], Uint8Array>;
};
type Cell = Paragraph | Table;
type Job = Extract<Block, { kind: 'job' }>;

/**
 * @param cv - a checked CV
 * @param plan - the plan place() made for this CV
 * @param photo - the bytes of the photo, a PNG or JPEG file
 * @returns the bytes of the .docx, the same for the same input
 */
export async function render(
  cv: Master,
  plan: Plan,
  photo: Uint8Array,
): Promise<Result<Uint8Array>> {
  const round = trySync$(() => circlePhoto(photo));
  if (round.error !== null) return rejected('render', [photoUnreadable()], round.error);
  const images = { photo: round.data, ...packagedImages() };
  return done(await stable(await Packer.toBuffer(document(cv, plan, images))));
}

export const photoUnreadable = () => ({
  code: 'PHOTO_UNREADABLE',
  path: 'person.photo',
  message: 'The photo is neither a PNG nor a JPEG picture',
  hint: 'Use a PNG or JPEG file, for example with "oriko photo set <file>"',
});

function packagedImages() {
  const icon = (name: string) => readFileSync(join(ASSETS, `${name}.png`));
  const icons = {
    pin: icon('pin'),
    home: icon('home'),
    phone: icon('phone'),
    mail: icon('mail'),
    globe: icon('globe'),
  };
  return { bar: solidPng(170, 23, COLOR.bar), jobPin: icon('job-pin'), icons };
}

function document(cv: Master, plan: Plan, images: Images) {
  const pages = plan.pages.flatMap((page, index) => [
    gap(index === 0 ? {} : { pageBreakBefore: true }),
    pageTable(leftCell(cv, page.left, index, images), rightCell(cv, page.right, index, images)),
  ]);
  return new Document({
    creator: `${cv.person.firstName} ${cv.person.lastName}`,
    title: 'Curriculum Vitae',
    styles: {
      default: {
        document: {
          run: { font: FONT.sans, size: 20, color: COLOR.text },
          paragraph: { spacing: { before: 0, after: 0, line: 240 } },
        },
      },
    },
    numbering: { config: [bulletMarks()] },
    sections: [
      {
        properties: {
          page: {
            size: { width: WIDTH.page, height: HEIGHT.page },
            margin: { top: 660, right: 0, bottom: 280, left: 0, header: 0, footer: 0 },
          },
        },
        headers: { default: new Header({ children: [bar()] }) },
        footers: { default: new Footer({ children: [bar()] }) },
        children: [...pages, gap()],
      },
    ],
  });
}

const bulletMarks = () => ({
  reference: 'bullets',
  levels: [
    {
      level: 0,
      format: LevelFormat.BULLET,
      text: '›',
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: { indent: { left: WIDTH.bulletIndent, hanging: WIDTH.bulletHanging } },
        run: { font: 'Segoe UI Symbol', size: 20, color: COLOR.text },
      },
    },
  ],
});

// ---------- small builders ----------

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const TIMELINE = {
  ...NO_BORDERS,
  right: { style: BorderStyle.SINGLE, size: 6, color: COLOR.line },
};
const NO_MARGINS = { top: 0, bottom: 0, left: 0, right: 0 };

const run = (text: string, options: IRunOptions = {}) =>
  new TextRun({ text, font: FONT.sans, size: 20, color: COLOR.text, ...options });

const para = (children: ParagraphChild[], options: IParagraphOptions = {}) =>
  new Paragraph({ children, ...options });

// Word needs a paragraph between two tables and at the end of a cell; at 1 pt it stays invisible.
// Google Docs adds a 14.5 pt line before a table that starts a page or a cell, so one stands there too.
const gap = (options: IParagraphOptions = {}) =>
  new Paragraph({ run: { size: 2 }, spacing: { line: 240 }, ...options });

const cell = (children: Cell[], width: number, options: Partial<ITableCellOptions> = {}) =>
  new TableCell({
    children,
    width: { size: width, type: WidthType.DXA },
    borders: NO_BORDERS,
    margins: NO_MARGINS,
    ...options,
  });

const table = (columnWidths: number[], rows: TableRow[]) =>
  new Table({
    width: { size: columnWidths.reduce((sum, width) => sum + width, 0), type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    margins: NO_MARGINS,
    rows,
  });

// An ImageRun takes CSS pixels, the page is laid out in pt.
const image = (data: Uint8Array, width: number, height: number) =>
  new ImageRun({
    type: 'png',
    data,
    transformation: { width: (width * 96) / 72, height: (height * 96) / 72 },
  });

const headingText = (text: string) =>
  new TextRun({ text, font: FONT.head, size: 28, color: COLOR.black, characterSpacing: 10 });

const dot = () => run('●', { font: FONT.symbol, size: 26, color: COLOR.black });

// The full-width bar of header and footer: a shaded empty paragraph, 12.6 pt high.
const bar = () =>
  new Paragraph({
    run: { font: FONT.symbol, size: 22 },
    shading: { type: ShadingType.CLEAR, fill: COLOR.bar, color: 'auto' },
    spacing: { line: 252, lineRule: LineRuleType.EXACT },
  });

const pageTable = (left: Cell[], right: Cell[]) =>
  table(
    [WIDTH.left, WIDTH.right, GUTTER],
    [
      new TableRow({
        children: [cell(left, WIDTH.left), cell(right, WIDTH.right), cell([gap()], GUTTER)],
      }),
    ],
  );

const blockOf = (cv: Master, placed: Placed) => cv.blocks.find(block => block.id === placed.id);

// ---------- left column ----------

function leftCell(cv: Master, column: Column, page: number, images: Images) {
  const top = page === 0 ? [gap(), nameBlock(cv.person, images.photo), gap()] : [gap()];
  const rows = column.blocks.flatMap(placed => jobRowsOf(cv, placed, images));
  if (rows.length === 0) return top;
  return [...top, table(JOB_COLUMNS, rows), gap()];
}

function nameBlock(person: Master['person'], photo: Uint8Array) {
  const [margin = 0, half = 0, , name = 0] = NAME_COLUMNS;
  const right = { alignment: AlignmentType.RIGHT, indent: { right: WIDTH.nameRight } };
  const nameRun = (text: string, size: number, characterSpacing: number) =>
    new TextRun({ text, font: FONT.head, size, color: COLOR.black, characterSpacing });
  const nameCell = cell(
    [
      para([nameRun(person.firstName, 40, -30)], { ...right, spacing: { before: 1540 } }),
      para([nameRun(person.lastName, 50, -20)], right),
      para([run(spacedRole(person.role), { font: FONT.light, size: 16 })], {
        ...right,
        spacing: { before: 150 },
      }),
    ],
    name,
    { verticalMerge: 'restart' },
  );
  return table(NAME_COLUMNS, [
    new TableRow({
      height: { value: 2380, rule: HeightRule.EXACT },
      children: [
        cell([gap()], margin),
        cell([para([image(photo, 119, 118.4)], { run: { size: 2 } })], half * 2, { columnSpan: 2 }),
        nameCell,
      ],
    }),
    new TableRow({
      height: { value: 760, rule: HeightRule.EXACT },
      children: [
        cell([gap()], margin),
        cell([gap()], half, { borders: TIMELINE }),
        cell([gap()], half),
        cell([gap()], name, { verticalMerge: 'continue' }),
      ],
    }),
    new TableRow({
      children: [
        cell([gap()], margin),
        cell([para([dot()], { alignment: AlignmentType.CENTER })], half * 2, { columnSpan: 2 }),
        cell([gap()], name),
      ],
    }),
  ]);
}

function jobRowsOf(cv: Master, placed: Placed, images: Images) {
  const block = blockOf(cv, placed);
  if (block?.kind !== 'job') return [];
  const heading = placed.heading === null ? [] : [sectionRow(placed.heading, images.bar)];
  return [...heading, ...jobRows(block, images.jobPin)];
}

// The section heading is a row of the jobs table: the gray bar on the left, the title beside it.
function sectionRow(heading: Heading, barImage: Uint8Array) {
  const spacing = { before: heading.before };
  const center = { verticalAlign: VerticalAlignTable.CENTER };
  return new TableRow({
    children: [
      cell(
        [para([image(barImage, 85, 11.4)], { spacing, indent: { left: -48 } })],
        WIDTH.date,
        center,
      ),
      cell(
        [para([headingText(heading.text)], { indent: { left: 160 }, spacing })],
        WIDTH.leftText - WIDTH.date,
        { columnSpan: 4, ...center },
      ),
    ],
  });
}

// A job is two rows. First: date, dot, title, place. Second: timeline, employer, bullets.
// Neither row may split, so a job stays whole even where the estimate is off.
function jobRows(job: Job, pin: Uint8Array) {
  const wide = { line: 276, lineRule: LineRuleType.AUTO };
  const date = para([run(`${job.from} – ${job.to}`, { font: FONT.light })], {
    indent: { left: WIDTH.dateIndent },
    spacing: { before: SPACE.jobGap, ...wide },
  });
  const marker = para([dot()], {
    alignment: AlignmentType.CENTER,
    spacing: { before: SPACE.jobGap + 40 },
  });
  const title = para([run(job.title, { bold: true })], {
    indent: { left: WIDTH.jobIndent },
    spacing: { before: SPACE.jobGap, after: SPACE.afterJobTitle, ...wide },
  });
  const place = para([image(pin, 8.75, 8.75), run(` ${job.place}`, { font: FONT.light })], {
    alignment: AlignmentType.RIGHT,
    spacing: { before: SPACE.jobGap, ...wide },
  });
  const details = [
    para([run(job.employer)], {
      indent: { left: WIDTH.jobIndent },
      spacing: { after: SPACE.afterEmployer },
    }),
    ...job.bullets.map(bullet =>
      para([run(bullet)], { numbering: { reference: 'bullets', level: 0 } }),
    ),
  ];
  return [
    new TableRow({
      cantSplit: true,
      children: [
        cell([date], WIDTH.date, { verticalMerge: 'restart' }),
        cell([marker], WIDTH.rail * 2, { columnSpan: 2 }),
        cell([title], WIDTH.jobTitle),
        cell([place], WIDTH.place),
      ],
    }),
    new TableRow({
      cantSplit: true,
      children: [
        cell([gap()], WIDTH.date, { verticalMerge: 'continue' }),
        cell([gap()], WIDTH.rail, { borders: TIMELINE }),
        cell([gap()], WIDTH.rail),
        cell(details, WIDTH.jobTitle + WIDTH.place, { columnSpan: 2 }),
      ],
    }),
  ];
}

// ---------- right column ----------

function rightCell(cv: Master, column: Column, page: number, images: Images) {
  const top = page === 0 ? contactBlock(cv.contact, images.icons) : [];
  const children = [...top, ...column.blocks.flatMap(placed => rightBlock(cv, placed))];
  const last = children.at(-1);
  const endsWithParagraph = last instanceof Paragraph;
  return endsWithParagraph ? children : [...children, gap()];
}

function contactBlock(contact: Master['contact'], icons: Images['icons']): Cell[] {
  const columns = [WIDTH.contactIcon, WIDTH.right - WIDTH.contactIcon];
  const rows = contact.items.map(item => {
    const size = ICON_SIZE[item.icon];
    const icon = para([image(icons[item.icon], size, size)], {
      alignment: AlignmentType.CENTER,
      indent: { right: 184 },
    });
    const lines = item.lines.map((line, index) => run(line, index === 0 ? {} : { break: 1 }));
    const content =
      item.link === undefined
        ? lines
        : [new ExternalHyperlink({ link: item.link, children: lines })];
    return new TableRow({
      children: [
        cell([icon], WIDTH.contactIcon),
        cell([para(content, { spacing: { after: SPACE.afterContactRow } })], columns[1] ?? 0),
      ],
    });
  });
  const heading = para([headingText(contact.title)], {
    indent: { left: 60 },
    spacing: { before: SPACE.rightTop, after: SPACE.afterContactHeading },
  });
  // A .docx table needs at least one row; a new CV starts without contact lines.
  return rows.length === 0 ? [heading] : [heading, table(columns, rows)];
}

function rightBlock(cv: Master, placed: Placed): Cell[] {
  const block = blockOf(cv, placed);
  if (block === undefined || block.kind === 'job') return [];
  const heading = placed.heading === null ? [] : [sectionHeading(placed.heading)];
  const title = block.title === undefined ? [] : [blockTitle(block.title)];
  return [...heading, ...title, ...content(block)];
}

const sectionHeading = (heading: Heading) =>
  para([headingText(heading.text)], {
    indent: { left: WIDTH.indent },
    spacing: { before: heading.before, after: heading.after },
  });

const blockTitle = (title: string) =>
  para([run(title, { bold: true })], {
    indent: { left: WIDTH.indent },
    spacing: { before: SPACE.beforeTitle, after: SPACE.afterTitle },
  });

function content(block: Exclude<Block, Job>): Cell[] {
  switch (block.kind) {
    case 'rated':
      return [ratedTable(block.items)];
    case 'list':
      return [
        para([run(block.items.join(', '))], {
          indent: { left: WIDTH.indent, right: WIDTH.textRight },
        }),
      ];
    case 'entries':
      return block.items.flatMap((item, index) => entry(item, index === block.items.length - 1));
  }
}

// One rated item is one row: the name on the left, the dots on the right.
function ratedTable(items: { name: string; level: number }[]) {
  const columns = [WIDTH.ratedName, WIDTH.right - WIDTH.ratedName];
  const rows = items.map(
    item =>
      new TableRow({
        children: [
          cell(
            [
              para([run(item.name)], {
                indent: { left: WIDTH.indent },
                spacing: { after: SPACE.ratedPad },
              }),
            ],
            WIDTH.ratedName,
          ),
          cell([para(dots(item.level), { spacing: { before: SPACE.ratedPad } })], columns[1] ?? 0),
        ],
      }),
  );
  return table(columns, rows);
}

// The dots are text: Google Docs has no letter spacing, so a small space stands between them.
function dots(level: number) {
  const children: TextRun[] = [];
  for (let index = 0; index < LIMITS.level; index++) {
    if (index > 0) children.push(new TextRun({ text: ' ', font: FONT.symbol, size: 16 }));
    children.push(
      new TextRun({
        text: '●',
        font: FONT.symbol,
        size: 22,
        color: index < level ? COLOR.dotOn : COLOR.dotOff,
      }),
    );
  }
  return children;
}

function entry(item: { title: string; note: string }, isLast: boolean) {
  const indent = { left: WIDTH.indent, right: WIDTH.textRight };
  return [
    para([run(item.title, { bold: true })], { indent, spacing: { after: SPACE.afterEntryTitle } }),
    para([run(item.note, { italics: true })], {
      indent,
      spacing: { after: isLast ? 0 : SPACE.entryGap },
    }),
  ];
}
