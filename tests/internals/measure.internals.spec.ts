import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lineCount } from '../../layout/measure.ts';

// Widths of single words in Open Sans Regular 10 pt, measured in a PDF that Word wrote, in pt.
const MEASURED: [string, number][] = [
  ['Delivered', 44.1],
  ['supermarket', 60.0],
  ['Advertisement', 68.2],
  ['process-optimization', 98.0],
  ['Hamburg', 44.2],
  ['Engineer,', 43.4],
];

// A word fills one line that is a little wider than the word, and breaks in one a little narrower.
test('estimates the width of a word within 1 pt of its measured width', () => {
  for (const [word, width] of MEASURED) {
    assert.deepEqual([lineCount(word, width + 1), lineCount(word, width - 1)], [1, 2], word);
  }
});

test('breaks a line at a space and never at a hyphen, as Google Docs does', () => {
  assert.equal(lineCount('Delivered supermarket', 44.1 + 2.6 + 60.0 + 1), 1);
  assert.equal(lineCount('Delivered supermarket', 44.1 + 2.6 + 60.0 - 1), 2);
  assert.equal(lineCount('process-optimization', 98.0 + 1), 1);
});
