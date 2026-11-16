/**
 * Every distance of the page, shared by the estimate and the renderer so the two cannot drift.
 *
 * SPACE, WIDTH, HEIGHT: spacing and sizes in DXA, the unit of a .docx (20 DXA are 1 pt).
 * LINE: the height of one line per font, in pt.
 * COLUMN_HEIGHT, LEFT_START: how much a column holds, and where the left one starts, in pt.
 * pt: a DXA length in pt.
 *
 * One spacing per kind of block, wherever the block stands: a moved block looks like its
 * neighbours. The values come from the reference PDF, which was less regular.
 *
 * @example const height = pt(SPACE.jobGap) + LINE.wide;
 */
export const SPACE = {
  jobGap: 554,
  // A blank line between a job's title and its employer, so title and date read as its heading.
  afterJobTitle: 352,
  afterEmployer: 80,
  leftTopFirst: 583,
  // On a later page the left heading stands level with the right one, as a Google Docs PDF shows.
  leftTop: 260,
  sectionGap: 748,
  rightTop: 320,
  afterContactHeading: 378,
  afterContactRow: 120,
  headingToRated: 318,
  headingToText: 20,
  beforeTitle: 366,
  afterTitle: 120,
  ratedPad: 20,
  afterEntryTitle: 60,
  entryGap: 388,
} as const;

export const WIDTH = {
  page: 11906,
  left: 8500,
  right: 3300,
  leftText: 7766,
  // Left of a job's timeline, below the gray bar of its section heading.
  gutter: 1760,
  rail: 184,
  jobTitle: 3592,
  // Right of a job's title; wide enough for '06/2017 – 02/2021' on one line.
  jobDate: 2046,
  contactIcon: 564,
  ratedName: 1730,
  indent: 120,
  textRight: 40,
  jobIndent: 292,
  bulletIndent: 632,
  bulletHanging: 340,
  name: 4632,
  nameRight: 140,
} as const;

/** A4. */
export const HEIGHT = { page: 16838 } as const;

/** Open Sans 10 pt single and at 1.15, Calibri 14 pt, Arial 11 pt. */
export const LINE = { body: 13.62, wide: 15.66, heading: 17.09, dots: 12.65 } as const;

/**
 * The body is 794.9 pt high; spacer paragraphs take 3 pt, and 8 pt stay free for the estimate.
 *
 * Google Docs set a column of the reference CV up to 4.1 pt lower than estimated, summed over its
 * jobs, so the reserve is twice that.
 */
export const COLUMN_HEIGHT = 784;

/** Below the name block on the first page, measured in the reference PDF; below a spacer on the others. */
export const LEFT_START = { first: 181, other: 3 } as const;

export const pt = (dxa: number) => dxa / 20;
