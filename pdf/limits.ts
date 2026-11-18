/**
 * The limit on one run of LibreOffice when it sets a PDF.
 *
 * PDF_LIMITS: the seconds one run may take.
 *
 * @example await run(soffice, args, { timeout: PDF_LIMITS.pdfSeconds * 1000, env });
 */
export const PDF_LIMITS = {
  /** One run of LibreOffice; its first run on a system sets up its profile and takes longest. */
  pdfSeconds: 120,
} as const;
