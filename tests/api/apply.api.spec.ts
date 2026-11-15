import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apply } from '../../edit/apply.ts';
import { codes, fixture, unwrap } from '../utils/fixture.ts';

const order = (master: { blocks: { id: string }[] }) => master.blocks.map(block => block.id);
const block = (master: ReturnType<typeof fixture>, id: string) =>
  master.blocks.find(candidate => candidate.id === id);

test('block move puts a block after its anchor and sets or clears its page', () => {
  const moved = unwrap(
    apply(fixture(), 'block move', { id: 'strengths', after: 'programming-languages', page: 2 }),
  );
  assert.deepEqual(order(moved).slice(7, 10), ['programming-languages', 'strengths', 'expertise']);
  assert.equal(block(moved, 'strengths')?.page, 2);
  const cleared = unwrap(apply(moved, 'block move', { id: 'strengths', page: null }));
  assert.equal(block(cleared, 'strengths')?.page, undefined);
});

test('block add puts a new block before its anchor', () => {
  const added = {
    id: 'cloud',
    kind: 'rated',
    section: 'Skills',
    title: 'Cloud',
    items: [{ name: 'AWS', level: 3 }],
  };
  const master = unwrap(apply(fixture(), 'block add', { block: added, before: 'expertise' }));
  assert.deepEqual(order(master).slice(7, 10), ['programming-languages', 'cloud', 'expertise']);
});

test('block update changes fields, and null removes an optional one', () => {
  const master = unwrap(
    apply(fixture(), 'block update', { id: 'campus', set: { title: 'Lead', page: null } }),
  );
  const changed = block(master, 'campus');
  assert.equal(changed?.kind === 'job' && changed.title, 'Lead');
  assert.equal(changed?.page, undefined);
});

test('block remove takes the block out', () => {
  const master = unwrap(apply(fixture(), 'block remove', { id: 'awards' }));
  assert.equal(order(master).includes('awards'), false);
});

test('item commands add, change, move and remove one item', () => {
  let master = unwrap(
    apply(fixture(), 'item add', {
      block: 'programming-languages',
      value: { name: 'Zig', level: 2 },
      index: 0,
    }),
  );
  master = unwrap(
    apply(master, 'item update', { block: 'programming-languages', index: 0, value: { level: 4 } }),
  );
  master = unwrap(apply(master, 'item move', { block: 'programming-languages', index: 0, to: 2 }));
  const languages = block(master, 'programming-languages');
  assert.deepEqual(languages?.kind === 'rated' && languages.items.slice(0, 3), [
    { name: 'Go', level: 5 },
    { name: 'TypeScript', level: 4 },
    { name: 'Zig', level: 4 },
  ]);
  master = unwrap(apply(master, 'item remove', { block: 'northwind', index: 0 }));
  const northwind = block(master, 'northwind');
  assert.equal(northwind?.kind === 'job' && northwind.bullets.length, 4);
});

test('cv update changes the language, the pages, the person and the contact title', () => {
  const input = {
    language: 'de',
    pages: 3,
    person: { role: 'Staff Engineer' },
    contact: { title: 'Kontakt' },
  };
  const master = unwrap(apply(fixture(), 'cv update', input));
  assert.deepEqual(
    [master.language, master.pages, master.person.role, master.contact.title],
    ['de', 3, 'Staff Engineer', 'Kontakt'],
  );
  assert.equal(master.person.firstName, 'Jane');
});

test('contact commands add, change, move and remove one contact line', () => {
  let master = unwrap(
    apply(fixture(), 'contact add', {
      value: { icon: 'globe', lines: ['Blog'], link: 'https://example.com/blog' },
      index: 0,
    }),
  );
  master = unwrap(apply(master, 'contact update', { index: 0, value: { lines: ['Weblog'] } }));
  master = unwrap(apply(master, 'contact move', { index: 0, to: 5 }));
  assert.deepEqual(master.contact.items[5], {
    icon: 'globe',
    lines: ['Weblog'],
    link: 'https://example.com/blog',
  });
  master = unwrap(apply(master, 'contact remove', { index: 5 }));
  assert.equal(master.contact.items.length, 5);
});

test('leaves the master it was given unchanged', () => {
  const before = fixture();
  unwrap(apply(before, 'block remove', { id: 'awards' }));
  assert.deepEqual(before, fixture());
});

test('refuses what it cannot do, with the code of the reason', () => {
  const cases: [string, unknown, string][] = [
    ['block move', { id: 'nobody', page: 2 }, 'UNKNOWN_BLOCK'],
    ['block move', { id: 'northwind', after: 'libraries' }, 'OTHER_COLUMN'],
    ['block move', { id: 'northwind' }, 'NOTHING_TO_DO'],
    ['block move', { id: 'northwind', before: 'bluebird', after: 'bluebird' }, 'BOTH_ANCHORS'],
    [
      'block add',
      { block: { id: 'northwind', kind: 'list', section: 'Skills', title: 'X', items: ['a'] } },
      'DUPLICATE_ID',
    ],
    ['block update', { id: 'northwind', set: { kind: 'list' } }, 'SCHEMA'],
    ['item update', { block: 'northwind', index: 9, value: 'x' }, 'INDEX_OUT_OF_RANGE'],
    ['item update', { block: 'programming-languages', index: 0, value: { level: 6 } }, 'SCHEMA'],
    ['item add', { block: 'programming-languages', value: 'not an object' }, 'SCHEMA'],
    ['block paint', { id: 'northwind' }, 'UNKNOWN_COMMAND'],
    ['cv update', { person: { photo: 'other.png' } }, 'SCHEMA'],
    ['cv update', { language: 'english' }, 'SCHEMA'],
    ['contact add', { value: { icon: 'fax', lines: ['1'] } }, 'SCHEMA'],
    ['contact remove', { index: 9 }, 'INDEX_OUT_OF_RANGE'],
  ];
  for (const [command, input, code] of cases)
    assert.deepEqual(codes(apply(fixture(), command, input)), [code], command);
});
