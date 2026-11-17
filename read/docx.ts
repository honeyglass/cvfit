/**
 * The text of a Word file, the one file of read/ that imports jszip.
 *
 * docxText: the paragraphs of word/document.xml, one per line.
 *
 * A Word file is a ZIP whose stated sizes can lie, so the unpacking itself stops at the limit.
 * Only the text inside w:t elements is taken; every other part of the XML is left out.
 *
 * @example const text = await docxText(bytes);
 */
import { $try } from '@honeyglass/utils/ts';
import JSZip from 'jszip';
import { LIMITS } from '../core/limits.ts';

const DOCUMENT = 'word/document.xml';

type DocxText =
  { text: string; problem: null } | { text: null; problem: 'broken' | 'no-word' | 'too-large' };

/**
 * @param bytes - the ZIP archive
 * @returns the text, or why there is none: no ZIP, no Word file, or more than the limit unpacked
 */
export async function docxText(bytes: Buffer): Promise<DocxText> {
  const archive = await $try(JSZip.loadAsync(bytes));
  if (archive.error !== null) return { text: null, problem: 'broken' };
  const entry = archive.data.file(DOCUMENT);
  if (entry === null) return { text: null, problem: 'no-word' };
  const xml = await $try(unpacked(entry, LIMITS.documentBytes));
  if (xml.error !== null) return { text: null, problem: 'broken' };
  if (xml.data === null) return { text: null, problem: 'too-large' };
  return { text: paragraphs(xml.data), problem: null };
}

// The bytes as they unpack, stopped one chunk past the limit; null when it was passed.
function unpacked(entry: JSZip.JSZipObject, limit: number) {
  return new Promise<string | null>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    const stream = entry.nodeStream('nodebuffer');
    stream.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > limit) {
        stream.pause();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

// A text run, a tab, a line break or the end of a paragraph; nothing else of the XML counts.
const TOKEN = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>|<\/w:p>/g;

function paragraphs(xml: string) {
  let text = '';
  for (const match of xml.matchAll(TOKEN)) {
    const [token, run] = match;
    if (run !== undefined) text += decoded(run);
    else text += token === '<w:tab/>' ? ' ' : '\n';
  }
  return text;
}

// The five entities XML names, and character references; any other '&' stays as it is.
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const decoded = (run: string) =>
  run.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, name: string) => {
    if (name.startsWith('#x') || name.startsWith('#X'))
      return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith('#')) return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
