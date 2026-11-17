/**
 * Documents of every kind oriko reads, built from bytes, so a test needs no file from outside.
 *
 * pdf: a one-page PDF with one line of text, or with none.
 * docx: a Word file whose paragraphs hold the given texts.
 * zip: a ZIP archive with the given entries, such as one that is no Word file.
 *
 * @example const bytes = pdf('Senior Go Engineer');
 */
import JSZip from 'jszip';

/**
 * @param text - the line on the page; none for a page without text, such as a scan
 * @returns the bytes of the PDF
 */
export function pdf(text?: string) {
  const stream = text === undefined ? '' : `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const [index, object] of objects.entries()) {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

export const zip = async (entries: Record<string, string>) => {
  const archive = new JSZip();
  for (const [name, content] of Object.entries(entries)) archive.file(name, content);
  return archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
};

export const docx = (paragraphs: string[]) =>
  zip({
    'word/document.xml': `<?xml version="1.0"?><w:document xmlns:w="w"><w:body>${paragraphs
      .map(text => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`)
      .join('')}</w:body></w:document>`,
  });
