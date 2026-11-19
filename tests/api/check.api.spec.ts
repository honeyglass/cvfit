import assert from 'node:assert/strict';
import { test } from 'node:test';
import { check } from '../../core/check.ts';
import { codes, fixture, unwrap } from '../utils/fixture.ts';

test('accepts the reference CV with all of its blocks', () => {
  assert.equal(unwrap(check(fixture())).blocks.length, 15);
});

test('reports every schema issue of one input, each with its path', () => {
  const cv: Record<string, unknown> = fixture();
  cv.pages = 9;
  cv.color = 'red';
  const result = check(cv);
  assert.deepEqual(codes(result), ['SCHEMA', 'SCHEMA']);
  assert.deepEqual(result.error?.issues.map(issue => issue.path).sort(), ['', 'pages']);
});

test('refuses a level above five', () => {
  const cv = fixture();
  const languages = cv.blocks[7];
  assert.equal(languages?.kind, 'rated');
  if (languages?.kind === 'rated') languages.items[0] = { name: 'TypeScript', level: 6 };
  const result = check(cv);
  assert.deepEqual(
    result.error?.issues.map(issue => issue.path),
    ['blocks.7.items.0.level'],
  );
});

test('refuses a language that is not a two-letter code', () => {
  const cv: Record<string, unknown> = fixture();
  cv.language = 'english';
  assert.deepEqual(
    check(cv).error?.issues.map(issue => issue.path),
    ['language'],
  );
});

test('a profile may name the CV it belongs to', () => {
  assert.equal(unwrap(check(fixture(), { cv: 'jane-doe' })).blocks.length, 15);
});

test('refuses a link that is not https', () => {
  const cv = fixture();
  const last = cv.contact.items.at(-1);
  if (last !== undefined) last.link = 'javascript:alert(1)';
  assert.deepEqual(codes(check(cv)), ['SCHEMA']);
});

test('refuses text that hides a line break', () => {
  const cv = fixture();
  cv.person.role = 'Engineer\nAdmin';
  assert.deepEqual(codes(check(cv)), ['SCHEMA']);
});

test('refuses two blocks with one id', () => {
  const cv = fixture();
  const first = cv.blocks[0];
  if (first !== undefined) cv.blocks.push(structuredClone(first));
  assert.deepEqual(codes(check(cv)), ['DUPLICATE_ID']);
});

test('refuses an untitled block next to another block of its section', () => {
  const cv = fixture();
  const interests = cv.blocks[13];
  if (interests !== undefined) interests.section = 'Languages';
  assert.deepEqual(codes(check(cv)), ['UNTITLED_NOT_ALONE', 'UNTITLED_NOT_ALONE']);
});

test('a profile hides a block, replaces fields, reorders and names its own photo', () => {
  const profile = {
    person: { role: 'Staff Engineer', photo: 'photos/acme.png' },
    order: ['languages', 'expertise'],
    blocks: { harbor: { hidden: true }, northwind: { bullets: ['Only this'] } },
  };
  const cv = unwrap(check(fixture(), profile));
  assert.deepEqual([cv.person.role, cv.person.photo], ['Staff Engineer', 'photos/acme.png']);
  assert.deepEqual(
    cv.blocks.slice(0, 5).map(block => block.id),
    ['languages', 'expertise', 'northwind', 'bluebird', 'lumen'],
  );
  const northwind = cv.blocks[2];
  assert.deepEqual(northwind?.kind === 'job' && northwind.bullets, ['Only this']);
});

test('a profile shows a block the master hides', () => {
  const cv = fixture();
  const first = cv.blocks[0];
  if (first !== undefined) first.hidden = true;
  assert.equal(unwrap(check(cv)).blocks.length, 14);
  assert.equal(unwrap(check(cv, { blocks: { northwind: { hidden: false } } })).blocks.length, 15);
});

test('a profile drops and reorders the items of its master, and may lower a level', () => {
  const profile = {
    blocks: {
      'additional-skills': { items: ['Terraform', 'PostgreSQL'] },
      languages: { items: [{ name: 'English', level: 3 }] },
      awards: { items: [{ title: 'Team Award', note: '03/2019' }] },
    },
  };
  assert.equal(check(fixture(), profile).error, null);
});

test('refuses a profile that changes a fact of its master', () => {
  const cases = [
    [
      { blocks: { 'additional-skills': { items: ['Go', 'Kubernetes'] } } },
      'ITEM_NOT_IN_MASTER',
      'blocks.additional-skills.items',
    ],
    [
      { blocks: { languages: { items: [{ name: 'Spanish', level: 2 }] } } },
      'ITEM_NOT_IN_MASTER',
      'blocks.languages.items',
    ],
    [
      { blocks: { 'programming-languages': { items: [{ name: 'Rust', level: 5 }] } } },
      'LEVEL_RAISED',
      'blocks.programming-languages.items',
    ],
    [
      { blocks: { awards: { items: [{ title: 'Team Award', note: '03/2018' }] } } },
      'ITEM_NOT_IN_MASTER',
      'blocks.awards.items',
    ],
    [
      { blocks: { northwind: { employer: 'Google' } } },
      'FACT_CHANGED',
      'blocks.northwind.employer',
    ],
    [{ blocks: { northwind: { title: 'CTO' } } }, 'FACT_CHANGED', 'blocks.northwind.title'],
    [{ blocks: { bluebird: { from: '01/2010' } } }, 'FACT_CHANGED', 'blocks.bluebird.from'],
    [{ blocks: { bluebird: { to: 'today' } } }, 'FACT_CHANGED', 'blocks.bluebird.to'],
    [{ blocks: { harbor: { place: 'Remote' } } }, 'FACT_CHANGED', 'blocks.harbor.place'],
    [{ order: ['bluebird', 'northwind'] }, 'JOB_MOVED', 'order'],
  ] as const;
  for (const [profile, code, path] of cases) {
    const issues = check(fixture(), profile).error?.issues.map(found => [found.code, found.path]);
    assert.deepEqual(issues, [[code, path]], JSON.stringify(profile));
  }
});

test('refuses a profile that names an unknown block or changes a kind', () => {
  assert.deepEqual(codes(check(fixture(), { blocks: { nobody: { hidden: true } } })), [
    'UNKNOWN_BLOCK',
  ]);
  assert.deepEqual(codes(check(fixture(), { order: ['nobody'] })), ['UNKNOWN_BLOCK']);
  const changed = check(fixture(), { blocks: { northwind: { kind: 'list' } } });
  assert.deepEqual(
    changed.error?.issues.map(issue => issue.path),
    ['blocks.northwind'],
  );
});
