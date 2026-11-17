/**
 * The text of an HTML page as Markdown, the one file that imports parse5.
 *
 * htmlText: the posting a page states as JSON-LD, else the text of the page's listed elements.
 *
 * Only the text of elements on the lists below is kept. Any other element goes with all it holds,
 * whether a script, a style, a menu or an element nobody planned for, so nothing a page hides
 * between its tags reaches the text.
 *
 * @example const markdown = htmlText(html);
 */
import { trySync$ } from '@honeyglass/utils/ts';
import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { z } from 'zod';

type Node = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];

// Elements whose content is kept: as a block of its own, inside a line, or only passed through.
const BLOCKS = new Set([
  'main',
  'article',
  'section',
  'header',
  'div',
  'p',
  'blockquote',
  'figure',
  'figcaption',
  'address',
  'details',
  'summary',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'ul',
  'ol',
  'dl',
  'dt',
  'dd',
]);
const INLINE = new Set([
  'a',
  'span',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'small',
  'mark',
  'time',
  'abbr',
  'code',
  'sub',
  'sup',
  's',
  'del',
  'ins',
  'q',
  'cite',
  'label',
]);
const ROOTS = new Set(['html', 'body']);
const HEADINGS: Record<string, number> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };

/**
 * @param html - the page
 * @returns Markdown, with whitespace and unsafe characters still to clean
 */
export function htmlText(html: string): string {
  const page = parse(html);
  return postingOf(page.childNodes) ?? markdown(page.childNodes);
}

function markdown(nodes: Node[]): string {
  return nodes.map(nodeText).join('');
}

function nodeText(node: Node): string {
  if (node.nodeName === '#text' && 'value' in node) return node.value.replace(/\s+/g, ' ');
  if ('tagName' in node === false) return '';
  return elementText(node);
}

function elementText(element: Element): string {
  const name = element.tagName;
  const inner = () => markdown(element.childNodes);
  const level = HEADINGS[name];
  if (level !== undefined) return `\n\n${'#'.repeat(level)} ${oneLine(inner())}\n\n`;
  if (name === 'li')
    return `\n- ${inner()
      .trim()
      .replace(/\n\s*\n/g, '\n')}`;
  if (name === 'br') return '\n';
  if (name === 'td' || name === 'th') return `${inner()} `;
  if (BLOCKS.has(name)) return `\n\n${inner()}\n\n`;
  if (INLINE.has(name) || ROOTS.has(name)) return inner();
  return '';
}

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

// The fields a JobPosting needs here; the rest of what a page states is left out.
const JobPosting = z.looseObject({
  title: z.string(),
  description: z.string(),
  hiringOrganization: z.union([z.string(), z.looseObject({ name: z.string() })]).optional(),
});

// The first JobPosting in the page's JSON-LD, as Markdown; null when the page states none.
function postingOf(nodes: Node[]): string | null {
  for (const json of linkedData(nodes)) {
    const value = trySync$((): unknown => JSON.parse(json));
    if (value.error !== null) continue;
    const posting = jobPosting(value.data, 0);
    if (posting === null) continue;
    const organization = posting.hiringOrganization;
    const name = typeof organization === 'object' ? organization.name : organization;
    const parts = [`# ${oneLine(posting.title)}`, name ?? '', htmlText(posting.description)];
    return parts.filter(part => part.trim() !== '').join('\n\n');
  }
  return null;
}

// The text of every script that holds JSON-LD, wherever it stands; such a script is data only.
function linkedData(nodes: Node[]): string[] {
  return nodes.flatMap(node => {
    if ('tagName' in node === false) return [];
    if (node.tagName === 'script' && isLinkedData(node)) return [rawText(node)];
    return linkedData(node.childNodes);
  });
}

const rawText = (element: Element) =>
  element.childNodes.map(node => ('value' in node ? node.value : '')).join('');

const isLinkedData = (element: Element) =>
  element.attrs.some(
    attr => attr.name === 'type' && attr.value.trim().toLowerCase() === 'application/ld+json',
  );

// A JobPosting itself, or one inside a list or a @graph, at most three levels down.
function jobPosting(value: unknown, depth: number): z.output<typeof JobPosting> | null {
  if (depth > 3 || typeof value !== 'object' || value === null) return null;
  const items = Array.isArray(value) ? value : [value];
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const type: unknown = '@type' in item ? item['@type'] : undefined;
    const isPosting = type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'));
    const parsed = isPosting ? JobPosting.safeParse(item) : null;
    if (parsed?.success === true) return parsed.data;
    const nested = '@graph' in item ? jobPosting(item['@graph'], depth + 1) : null;
    if (nested !== null) return nested;
  }
  return null;
}
