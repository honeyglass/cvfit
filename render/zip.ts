/**
 * The last pass over a .docx: the same input gives the same bytes, and Google Docs reads it right.
 *
 * stable: the .docx with fixed dates and ids, and the photo run made 1 pt high.
 *
 * The docx library stamps the build time, numbers drawings with a counter that outlives a
 * build, and gives each link a random id. All three are replaced by values the input fixes.
 *
 * @example const bytes = await stable(await Packer.toBuffer(document));
 */
import JSZip from 'jszip';

/** One date for every entry and for the document properties, so no build time enters the file. */
const EPOCH = new Date('2000-01-01T00:00:00Z');
const DOCUMENT = 'word/document.xml';
const RELATIONS = 'word/_rels/document.xml.rels';
const PROPERTIES = 'docProps/core.xml';

/**
 * @param docx - the bytes the docx library wrote
 * @returns the bytes of the final file
 */
export async function stable(docx: Uint8Array) {
  const source = await JSZip.loadAsync(docx);
  const links = linkIds((await source.file(DOCUMENT)?.async('string')) ?? '');
  const target = new JSZip();
  for (const [name, entry] of Object.entries(source.files)) {
    if (entry.dir) continue;
    const bytes = await entry.async('uint8array');
    target.file(name, rewritten(name, bytes, links), { date: EPOCH, createFolders: false });
  }
  return target.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

// The ids of the links, in the order the document uses them.
const linkIds = (xml: string) => [...xml.matchAll(/<w:hyperlink[^>]*r:id="([^"]+)"/g)].flatMap(match => match[1] ?? []);

function rewritten(name: string, bytes: Uint8Array, links: string[]) {
  const text = () => new TextDecoder().decode(bytes);
  if (name === DOCUMENT) return renumberDrawings(renameLinks(shrinkPhotoRun(text()), links));
  if (name === RELATIONS) return renameLinks(text(), links);
  if (name === PROPERTIES) return fixDates(text());
  return bytes;
}

// Google Docs sizes a line by the font of its runs. With a 1 pt font on the photo run, the
// timeline below starts right at the photo, not one text descent lower. The photo is the first drawing.
const shrinkPhotoRun = (xml: string) =>
  xml.replace('<w:r><w:drawing>', '<w:r><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr><w:drawing>');

function renameLinks(xml: string, links: string[]) {
  let renamed = xml;
  for (const [index, id] of links.entries()) renamed = renamed.replaceAll(`"${id}"`, `"rIdLink${index + 1}"`);
  return renamed;
}

function renumberDrawings(xml: string) {
  let count = 0;
  return xml.replace(/<wp:docPr id="\d+"/g, () => `<wp:docPr id="${++count}"`);
}

const fixDates = (xml: string) =>
  xml.replace(/(<dcterms:(?:created|modified)[^>]*>)[^<]*/g, `$1${EPOCH.toISOString()}`);
