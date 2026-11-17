/**
 * The one table of oriko's commands and options, so parsing, checks, schema and lists agree.
 *
 * OPTIONS, OptionName: every option with its type, whether a list holds its values, and its texts.
 * EVERYWHERE: the options every command takes.
 * COMMANDS, CommandName, Command: every command with what it does, its options, words and input.
 * SHAPES: the shapes a caller writes that no command takes whole, such as a profile or an item.
 *
 * A command takes only the options it lists, plus EVERYWHERE; any other is the caller's mistake.
 *
 * @example const { options, input } = COMMANDS['block add'];
 */
import { z } from 'zod';
import type { ZodType } from 'zod';
import { Block, ContactItem, ITEM, Master, NewCv, Profile } from '../data/cv.schema.ts';
import { INPUT } from '../edit/edit.schema.ts';

type Option = {
  type: 'string' | 'boolean';
  /** The values sit in a list, so the option without a value answers that list. */
  listed?: true;
  text: string;
  /** What to add when the option comes without a value and no list holds its values. */
  missing?: string;
  /** The option may come several times, each with a value of its own. */
  multiple?: true;
};

export const OPTIONS = {
  home: {
    type: 'string',
    text: 'the data folder with cvs/NAME.json and profiles/NAME.json; ~/.oriko when left out',
    missing: 'Add the data folder that holds cvs/ and profiles/, or leave out --home for ~/.oriko',
  },
  cv: {
    type: 'string',
    listed: true,
    text: 'the name of one CV; needed only when the data folder holds several and no profile names one',
  },
  profile: {
    type: 'string',
    listed: true,
    text: 'the name of one profile; it names its CV in its field cv',
  },
  out: {
    type: 'string',
    text: 'the .docx to write, for build; a path inside the working directory',
    missing: 'Add the path of the .docx file to write, inside the working directory',
  },
  json: {
    type: 'string',
    text: 'the input of an edit command; without it the input comes from stdin',
    missing: 'Run the command for the input shape, then pass it as one JSON object',
  },
  block: {
    type: 'string',
    listed: true,
    text: 'the id of one block to show in full, for show',
  },
  'dry-run': { type: 'boolean', text: 'check and answer, but write no file' },
  posting: {
    type: 'string',
    text: 'the job posting, for read: a PDF, Word, HTML or text file, or an https:// address',
    missing: 'Add the file or the https:// address of the job posting',
  },
  notes: {
    type: 'string',
    multiple: true,
    text: 'notes on the career, for read, kept beside the CV; may come several times',
    missing: 'Add the file or the https:// address of the notes',
  },
  resume: {
    type: 'string',
    text: 'an old CV, for read: its text is answered and stored nowhere',
    missing: 'Add the file or the https:// address of the old CV',
  },
  replace: {
    type: 'boolean',
    text: 'for read: overwrite the posting a profile already has',
  },
  style: {
    type: 'string',
    listed: true,
    text: 'the look of the .docx, for build: classic, or terminal like the preview; classic when left out',
  },
  output: {
    type: 'string',
    listed: true,
    text: 'json or text; json when stdout is no terminal',
  },
} as const satisfies Record<string, Option>;

export type OptionName = keyof typeof OPTIONS;

/** An option whose values sit in a list; a switch over it must answer every such option. */
export type ListedOption = {
  [Name in OptionName]: (typeof OPTIONS)[Name] extends { listed: true } ? Name : never;
}[OptionName];

export const isListed = (name: OptionName): name is ListedOption => 'listed' in OPTIONS[name];

/** What to add to an option without a value, the same whether it is missing or empty. */
export function missingHint(option: OptionName) {
  const spec: Option = OPTIONS[option];
  return spec.missing ?? `Add a value to --${option}`;
}

export const EVERYWHERE: OptionName[] = ['home', 'output'];

export type Command = {
  does: string;
  options: OptionName[];
  /** The words after the command's name, such as the file of photo set. */
  words?: string[];
  /** The words after the name are one value, such as the command schema shows. */
  joinsWords?: true;
  /** The input read from --json or stdin. */
  input?: ZodType;
  /** Options whose value is a new name, so no list holds it. */
  fresh?: OptionName[];
};

/** What a new name looks like, for an option that takes one. */
export const NEW_NAME =
  'Add a new name in lower-case words joined by hyphens; the command lists the names already taken';

const EDIT: OptionName[] = ['cv', 'json', 'dry-run'];

const edit = (does: string, input: ZodType): Command => ({ does, options: EDIT, input });

export const COMMANDS = {
  schema: {
    does: 'lists every command and option, or the input of one command',
    options: [],
    words: ['name'],
    joinsWords: true,
  },
  cvs: { does: 'lists the CVs and whether each fits its pages', options: [] },
  init: {
    does: 'creates a CV',
    options: ['cv', 'json', 'dry-run'],
    input: NewCv,
    fresh: ['cv'],
  },
  show: { does: 'outlines a CV, or shows one block in full', options: ['cv', 'profile', 'block'] },
  profiles: { does: 'lists the profiles and whether each fits its pages', options: [] },
  plan: { does: 'places every block on the pages', options: ['cv', 'profile'] },
  preview: { does: 'draws the pages in the terminal', options: ['cv', 'profile'] },
  build: {
    does: 'writes the Word file',
    options: ['cv', 'profile', 'out', 'style', 'dry-run'],
  },
  read: {
    does: 'reads a posting, notes or an old CV from a file or an https address',
    options: ['cv', 'profile', 'posting', 'notes', 'resume', 'replace', 'dry-run'],
  },
  'photo set': {
    does: 'stores the square photo of a CV, or of one profile',
    options: ['cv', 'profile', 'dry-run'],
    words: ['file'],
  },
  'block add': edit('adds a block, such as a job or a skill group', INPUT['block add']),
  'block update': edit('changes fields of a block', INPUT['block update']),
  'block remove': edit('removes a block', INPUT['block remove']),
  'block move': edit('moves a block, or pins it to a page', INPUT['block move']),
  'item add': edit('adds a bullet, a skill or an entry to a block', INPUT['item add']),
  'item update': edit('changes one item of a block', INPUT['item update']),
  'item remove': edit('removes one item of a block', INPUT['item remove']),
  'item move': edit('moves one item inside its block', INPUT['item move']),
  'cv update': edit(
    'changes the language, the pages, the person or the contact title',
    INPUT['cv update'],
  ),
  'contact add': edit('adds a contact line', INPUT['contact add']),
  'contact update': edit('changes a contact line', INPUT['contact update']),
  'contact remove': edit('removes a contact line', INPUT['contact remove']),
  'contact move': edit('moves a contact line', INPUT['contact move']),
} satisfies Record<string, Command>;

export type CommandName = keyof typeof COMMANDS;

// An item's shape depends on the kind of its block, so the one shape lists the kinds' shapes.
const Item = z
  .union([ITEM.job, ITEM.rated, ITEM.entries])
  .describe('job and list blocks take text, rated blocks {name, level}, entries {title, note}');

export const SHAPES = {
  master: Master,
  profile: Profile,
  block: Block,
  item: Item,
  contact: ContactItem,
};
