/**
 * The commands preview and build: the CV set on its pages, in the terminal or as a file.
 *
 * previewed: the pages of the CV as the terminal shows them.
 * build: the .docx or .pdf of the CV, written to --out.
 *
 * @example return build(call);
 */
import { shown } from '@honeyglass/utils/ts';
import { done, rejected } from '../core/errors.ts';
import type { Issue, Result } from '../core/errors.ts';
import { withCredits } from '../terminal/credits.ts';
import type { Master } from '../core/cv.schema.ts';
import { place } from '../core/place.ts';
import type { Plan } from '../core/place.ts';
import { render } from '../classic/docx.ts';
import type { Engine } from '../classic/docx.ts';
import { renderTerminal } from '../terminal/docx.ts';
import { toPdf } from '../pdf/convert.ts';
import { preview } from '../terminal/sheets.ts';
import { photoBytes, writeAll } from '../core/files.ts';
import { checked } from '../core/load.ts';
import { STYLES } from './commands.ts';
import { outputPath } from './out.ts';
import type { Call, Fields } from './types.ts';

export async function previewed(call: Call): Promise<Result<Fields>> {
  const cv = await checked(call.home, call.values.cv, call.values.profile);
  if (cv.error !== null) return cv;
  const sheet = planned(cv.data, call.values.credits === true);
  if (sheet.placed.error !== null) return sheet.placed;
  return done({ preview: preview(sheet.cv, sheet.placed.data) });
}

/**
 * The CV as the terminal look sets it, and its plan; the credits join the last page it fills.
 *
 * @param cv - a checked CV
 * @param hasCredits - whether the call asks for the credits
 * @returns the CV, with the credits when asked, and its plan
 */
function planned(cv: Master, hasCredits: boolean) {
  const placed = place(cv);
  if (placed.error !== null || hasCredits === false) return { cv, placed };
  const credited = withCredits(cv, placed.data.pages.length);
  return { cv: credited, placed: place(credited) };
}

export async function build(call: Call): Promise<Result<Fields>> {
  const style = STYLES.find(known => known === (call.values.style ?? 'classic'));
  if (style === undefined) return rejected('build', [unknownStyle(call.values.style ?? '')]);
  const hasCredits = call.values.credits === true;
  if (hasCredits && style !== 'terminal') return rejected('build', [creditsNeedTerminal()]);
  const out = await outputPath(call.io.cwd, call.values.out);
  if (out.error !== null) return out;
  const cv = await checked(call.home, call.values.cv, call.values.profile);
  if (cv.error !== null) return cv;
  const sheet = planned(cv.data, hasCredits);
  const placed = sheet.placed;
  if (placed.error !== null) return placed;
  const isPdf = out.data.name.endsWith('.pdf');
  const engine = isPdf ? 'libreoffice' : 'google';
  const docx = await rendered(call.home, sheet.cv, placed.data, style, engine);
  if (docx.error !== null) return docx;
  const file = isPdf ? await toPdf(docx.data, call.io.soffice) : docx;
  if (file.error !== null) return file;
  const isDryRun = call.values['dry-run'] === true;
  const files = [{ path: out.data.path, content: file.data }];
  const written = isDryRun ? done(undefined) : await writeAll(files, 'out');
  if (written.error !== null) return written;
  return done({
    out: out.data.name,
    style,
    bytes: file.data.length,
    pages: placed.data.pages.length,
    written: isDryRun === false,
  });
}

// Only the classic look shows the photo, so only it reads the photo file. The terminal look sets
// alike in Google Docs and LibreOffice, so only the classic one takes the engine.
async function rendered(
  home: string,
  cv: Master,
  plan: Plan,
  style: (typeof STYLES)[number],
  engine: Engine,
) {
  if (style === 'terminal') return renderTerminal(cv, plan);
  const picture = await photoBytes(home, cv.person.photo);
  if (picture.error !== null) return picture;
  return render(cv, plan, picture.data, engine);
}

const creditsNeedTerminal = (): Issue => ({
  code: 'CREDITS_NEED_TERMINAL',
  path: 'credits',
  message: 'The option --credits works only in the terminal look',
  hint: 'Add --style terminal, or leave out --credits',
});

const unknownStyle = (style: string): Issue => ({
  code: 'UNKNOWN_STYLE',
  path: 'style',
  message: `No look is called ${shown(style)}`,
  hint: `Use one of: ${STYLES.join(', ')}`,
});
