import assert from 'node:assert/strict';
import { test } from 'node:test';
import { place } from '../../layout/place.ts';
import { preview } from '../../preview/text.ts';
import { fixture, unwrap } from '../utils/fixture.ts';

const text = preview(fixture(), unwrap(place(fixture())));
const lines = text.split('\n');

test('shows every page with the blocks the plan puts on it', () => {
  const secondPage = text.indexOf('Page 2 of 2');
  assert.ok(text.indexOf('Page 1 of 2') >= 0 && secondPage > 0);
  assert.ok(text.indexOf('Northwind Logistics GmbH') < secondPage);
  assert.ok(text.indexOf('Campus Software Lab') > secondPage);
  assert.ok(text.indexOf('Team Award') > secondPage);
});

test('shows a job with its date and a rated item with its dots', () => {
  assert.ok(
    lines.some(
      line => line.includes('03/2021 – today') && line.includes('● Senior Backend Engineer'),
    ),
  );
  assert.ok(lines.some(line => /Go\s+●●●●● │$/.test(line)));
  assert.ok(lines.some(line => /Python\s+●●●○○ │$/.test(line)));
});

test('continues a long job title on the timeline, below the title text', () => {
  const cv = fixture();
  const job = cv.blocks[0];
  if (job?.kind === 'job') job.title = 'Apprenticeship IT Specialist for System Integration';
  const sheet = preview(cv, unwrap(place(cv))).split('\n');
  const first = sheet.findIndex(line => line.includes('● Apprenticeship IT Specialist for'));
  assert.match(sheet[first + 1] ?? '', /^│ {19}│ System Integration +│/);
});

test('wraps a long rated name instead of cutting it off', () => {
  const cv = fixture();
  const rated = cv.blocks.find(block => block.kind === 'rated');
  if (rated?.kind === 'rated') rated.items[0] = { name: 'Event-driven systems at scale', level: 5 };
  const sheet = preview(cv, unwrap(place(cv))).split('\n');
  const first = sheet.findIndex(line => /│   Event-driven\s+●●●●● │$/.test(line));
  assert.match(sheet[first + 1] ?? '', /│   systems at scale {8}│$/);
});

// The right column of a row: the 25 characters between its two frame lines.
const rightCell = (line: string) => line.slice(-27, -2).trim();

test('rules each section heading off, with more room above it than between groups', () => {
  const heading = lines.findIndex(line => rightCell(line).startsWith('SKILLS ─'));
  assert.deepEqual(lines.slice(heading - 2, heading + 2).map(rightCell), [
    '',
    '',
    rightCell(lines[heading] ?? ''),
    '',
  ]);
  assert.ok(lines.some(line => line.includes('│ PROFESSIONAL EXPERIENCE ──')));
  assert.ok(lines.some(line => rightCell(line).startsWith('CONTACT ─')));
});

test('indents the items of a group below its title', () => {
  assert.ok(lines.some(line => /│   Go\s+●●●●● │$/.test(line)));
  assert.equal(
    lines.some(line => /│ Go\s+●●●●● │$/.test(line)),
    false,
  );
});

test('keeps every line within 84 characters, so the frame holds in a narrow terminal', () => {
  assert.deepEqual(
    lines.filter(line => [...line].length > 84),
    [],
  );
});

test('frames every page, so all of its lines are equally wide', () => {
  const widths = new Set(lines.filter(line => line !== '').map(line => [...line].length));
  assert.equal(widths.size, 1);
  assert.equal(lines.filter(line => line.startsWith('╭─ Page')).length, 2);
});

// Oriko, six rows tall, so the place of the photo stands out on paper too.
test('shows a face where the photo stands, on the first page only', () => {
  assert.equal(text.split('│ ●   ●  │').length - 1, 1);
  assert.ok(text.indexOf('│ ●   ●  │') < text.indexOf('Page 2 of 2'));
  const top = lines.findIndex(line => line.includes('╭───────┐'));
  assert.ok(lines[top + 5]?.includes('╰────────╯'));
  assert.ok(lines.slice(top, top + 6).some(line => line.includes('Jane')));
});

// A blank row above the photo, two characters left of it: about the same room, as a row is
// twice as high as a character is wide. Name and contact start on the photo's first row.
test('leaves as much room above the photo as left of it, and lines the name up with it', () => {
  const top = lines.findIndex(line => line.includes('╭───────┐'));
  assert.match(lines[top] ?? '', /^│   ╭───────┐ +Jane │ CONTACT ─+ │$/);
  assert.match(lines[top - 1] ?? '', /^│ +│ +│$/);
  assert.equal(lines[top - 2]?.startsWith('╭─ Page 1'), true);
});

test('marks each bullet of a job with an angle that every font sets', () => {
  assert.ok(lines.some(line => line.includes('│ › Rebuilt the shipment')));
});

test('shows how full each column of a page is', () => {
  const half = { used: 394, free: 394, blocks: [] };
  const full = { used: 788, free: 0, blocks: [] };
  const sheet = preview(fixture(), { pages: [{ left: half, right: full }] });
  assert.ok(sheet.includes('Left  ■■■■■□□□□□ 50 % full'));
  assert.ok(sheet.includes('Right ■■■■■■■■■■ 100 % full'));
});
