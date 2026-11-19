/**
 * What a README holds, read by micromark, the reference parser of CommonMark, with GitHub's GFM.
 *
 * Page, Section, Item, pageOf: the sections, the bullets of a section, the links and the anchors.
 *
 * The only file that imports micromark. A link inside HTML is invisible to it, so a page tells
 * whether it holds HTML, and the caller refuses such a page instead of trusting a partial read.
 *
 * @example const { sections, links } = pageOf(readFileSync(path, 'utf8'));
 */
import { parse, postprocess, preprocess } from 'micromark';
import { gfm } from 'micromark-extension-gfm';

/** One bullet: the code span it starts with when a ':' follows it, and the raw text after that. */
export type Item = { label: string | undefined; rest: string };

/**
 * A part under a heading of depth 2, up to the next heading of depth 2 or less, or to a '---'.
 *
 * Lines count from 0; the body runs from the line after the heading up to, not including, `end`.
 * `items` is set only when the body is one flat bullet list and nothing else.
 */
export type Section = { title: string; line: number; end: number; items: Item[] | undefined };

export type Page = {
  sections: Section[];
  links: { destination: string; line: number }[];
  slugs: Set<string>;
  html: boolean;
};

type Event = ReturnType<typeof postprocess>[number];
type Token = Event[1];
type Block = { token: Token; children: Token[] };

const DESTINATIONS = new Set(['resourceDestinationString', 'definitionDestinationString']);
const HTML = new Set(['htmlFlow', 'htmlText']);
const LISTS = new Set(['listUnordered', 'listOrdered']);
const LINE_ENDINGS = new Set(['lineEnding', 'lineEndingBlank']);

/**
 * @param text - the whole text of a Markdown file
 * @returns its sections, every link destination with its line, its anchors, and whether it has HTML
 */
export function pageOf(text: string): Page {
  const events = postprocess(
    parse({ extensions: [gfm()] })
      .document()
      .write(preprocess()(text, undefined, true)),
  );
  const tokens = events.flatMap(([kind, token]) => (kind === 'enter' ? [token] : []));
  return {
    sections: sectionsOf(blocksOf(events), text),
    links: tokens
      .filter(token => DESTINATIONS.has(token.type))
      .map(token => ({ destination: sliceOf(text, token), line: token.start.line - 1 })),
    slugs: slugsOf(events, text),
    html: tokens.some(token => HTML.has(token.type)),
  };
}

// The top-level blocks of the document, each with every token inside it.
function blocksOf(events: Event[]) {
  const blocks: Block[] = [];
  let depth = 0;
  for (const [kind, token] of events) {
    if (kind === 'exit') depth--;
    if (kind === 'exit') continue;
    if (depth === 0) blocks.push({ token, children: [] });
    if (depth > 0) blocks.at(-1)?.children.push(token);
    depth++;
  }
  return blocks.filter(block => LINE_ENDINGS.has(block.token.type) === false);
}

function sectionsOf(blocks: Block[], text: string) {
  const sections: Section[] = [];
  let open: { title: string; line: number; body: Block[] } | undefined;
  for (const block of blocks) {
    const depth = headingDepth(block, text);
    const closes = (depth !== undefined && depth <= 2) || block.token.type === 'thematicBreak';
    if (open !== undefined && closes) sections.push(closed(open, block.token.start.line - 1, text));
    if (closes) open = undefined;
    if (depth === 2)
      open = { title: headingText(block, text).trim(), line: block.token.start.line - 1, body: [] };
    else open?.body.push(block);
  }
  if (open !== undefined) sections.push(closed(open, text.split('\n').length, text));
  return sections;
}

function closed(open: { title: string; line: number; body: Block[] }, end: number, text: string) {
  const [only, ...others] = open.body;
  const flat =
    only !== undefined &&
    others.length === 0 &&
    only.token.type === 'listUnordered' &&
    only.children.some(token => LISTS.has(token.type)) === false;
  const items = flat ? itemsOf(only, text) : undefined;
  return { title: open.title, line: open.line, end, items };
}

// Each bullet's text from just after its '- ' to the start of the next bullet, line ends trimmed.
function itemsOf(list: Block, text: string): Item[] {
  const starts = list.children.filter(token => token.type === 'listItemPrefix');
  return starts.map((prefix, index) => {
    const next = starts[index + 1]?.start.offset ?? list.token.end.offset;
    const raw = text.slice(prefix.end.offset, next).trimEnd();
    const code = list.children.find(
      token => token.type === 'codeText' && token.start.offset === prefix.end.offset,
    );
    const after = code === undefined ? '' : text.slice(code.end.offset, code.end.offset + 1);
    if (code === undefined || after !== ':') return { label: undefined, rest: raw };
    return {
      label: sliceOf(text, code).slice(1, -1),
      rest: raw.slice(code.end.offset - prefix.end.offset + 1),
    };
  });
}

// '## x' has depth 2; a heading underlined with '=' has depth 1, one underlined with '-' depth 2.
function headingDepth(block: Block, text: string) {
  const atx = block.children.find(token => token.type === 'atxHeadingSequence');
  if (block.token.type === 'atxHeading' && atx !== undefined)
    return atx.end.offset - atx.start.offset;
  const underline = block.children.find(token => token.type === 'setextHeadingLineSequence');
  if (block.token.type !== 'setextHeading' || underline === undefined) return undefined;
  return text[underline.start.offset] === '=' ? 1 : 2;
}

// The text a reader sees in a heading: its plain text and the insides of its code spans. A space
// after an image stays, as GitHub keeps it in the anchor: '## <img …> Docs' answers '#-docs'.
function headingText(block: Block, text: string) {
  return block.children
    .filter(token => token.type === 'data' || token.type === 'codeTextData')
    .map(token => sliceOf(text, token))
    .join('');
}

/**
 * GitHub's anchor of each heading, which GitHub documents only by its behavior.
 *
 * Lower case, every character but letters, marks, digits, '_', '-' and spaces dropped, spaces
 * turned into '-', and a heading seen before gets '-1', '-2' and so on.
 *
 * @param events - the events of the whole page
 * @param text - the page
 * @returns every anchor a link to this page may name
 */
function slugsOf(events: Event[], text: string) {
  const slugs = new Set<string>();
  for (const block of blocksOf(events).filter(item => headingDepth(item, text) !== undefined)) {
    const base = headingText(block, text)
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
      .replace(/ /g, '-');
    let slug = base;
    for (let count = 1; slugs.has(slug); count++) slug = `${base}-${count}`;
    slugs.add(slug);
  }
  return slugs;
}

const sliceOf = (text: string, token: Token) => text.slice(token.start.offset, token.end.offset);
