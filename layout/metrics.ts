/**
 * Every distance of the page, shared by the estimate and the renderer so the two cannot drift.
 *
 * SPACE, WIDTH: spacing and widths in DXA, the unit of a .docx (20 DXA are 1 pt).
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
  afterJobTitle: 80,
  afterEmployer: 80,
  leftTopFirst: 583,
  leftTop: 1580,
  sectionGap: 748,
  rightTop: 320,
  afterContactHeading: 378,
  afterContactRow: 120,
  afterContact: 1188,
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
  date: 1760,
  rail: 184,
  jobTitle: 3992,
  place: 1646,
  contactIcon: 564,
  ratedName: 1730,
  indent: 120,
  textRight: 40,
  dateIndent: 680,
  jobIndent: 292,
  bulletIndent: 632,
  bulletHanging: 340,
  name: 4632,
  nameRight: 140,
} as const;

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
