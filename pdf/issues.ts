/**
 * The issues of a PDF build, each made by one function.
 *
 * notInstalled, conversionFailed: LibreOffice missing, or failing on the .docx.
 *
 * @example if (soffice === undefined) return rejected('build', [issue.notInstalled()]);
 */
import { causeText } from '@honeyglass/utils/ts';
import { NOT_INSTALLED, SYSTEM_REFUSED } from '../core/errors.ts';
import type { Issue } from '../core/errors.ts';

export const notInstalled = (): Issue => ({
  code: NOT_INSTALLED,
  path: 'out',
  message: 'A PDF needs LibreOffice, and it is not installed',
  hint:
    'Ask the person to install LibreOffice, then call again: on macOS brew install --cask ' +
    'libreoffice, on Debian or Ubuntu sudo apt install libreoffice, on Windows winget install ' +
    'TheDocumentFoundation.LibreOffice, or from https://www.libreoffice.org/download. Without ' +
    'it, build a .docx and save it as PDF in Google Docs',
});

export const conversionFailed = (error: Error): Issue => ({
  code: SYSTEM_REFUSED,
  path: 'out',
  message: `LibreOffice wrote no PDF: ${causeText(error)}`,
  hint: 'Tell the person what LibreOffice answered; a .docx saved as PDF in Google Docs works without it',
});
