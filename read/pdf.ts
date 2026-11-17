/**
 * The text of a PDF, the one file that imports unpdf.
 *
 * pdfText: every page's text, joined; null for a document pdf.js cannot open.
 *
 * pdf.js writes its warnings to stdout, where they would break the JSON answer, so it stays silent.
 *
 * @example const text = await pdfText(bytes);
 */
import { $try } from '@honeyglass/utils/ts';
import { extractText, getDocumentProxy } from 'unpdf';

/**
 * @param bytes - the PDF
 * @returns the text, or the error pdf.js raised for a broken, encrypted or other unreadable PDF
 */
export async function pdfText(bytes: Buffer) {
  return $try(async () => {
    const document = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0 });
    return (await extractText(document, { mergePages: true })).text;
  });
}
