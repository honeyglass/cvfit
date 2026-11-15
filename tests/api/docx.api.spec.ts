import assert from 'node:assert/strict';
import { test } from 'node:test';
import JSZip from 'jszip';
import { place } from '../../layout/place.ts';
import { render } from '../../render/docx.ts';
import { fixture, photo, unwrap } from '../utils/fixture.ts';

const build = async () => unwrap(await render(fixture(), unwrap(place(fixture())), photo()));

test('renders the same bytes for the same input', async () => {
  assert.deepEqual(await build(), await build());
});

test('renders every page of the plan and the text of its blocks', async () => {
  const zip = await JSZip.loadAsync(await build());
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  assert.equal(xml.split('<w:pageBreakBefore/>').length - 1, 1);
  for (const text of ['Jane', 'Programming Languages', 'Campus Software Lab', 'Team Award', 'Gin, gRPC, React']) {
    assert.ok(xml.includes(text), text);
  }
});

test('refuses a photo that is no PNG', async () => {
  const result = await render(fixture(), unwrap(place(fixture())), Buffer.from('not a png'));
  assert.deepEqual(result.error?.issues.map(issue => issue.code), ['PHOTO_UNREADABLE']);
});
