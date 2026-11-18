/**
 * The reference CV of the tests and the helpers that read a result.
 *
 * fixture: a fresh copy of the reference CV, typed, so a test may change it.
 * unwrap: the data of a result, or its error thrown so the test fails with it.
 * codes: the issue codes of a refused result, in order.
 * photo: a small PNG that stands in for the photo.
 *
 * @example const plan = unwrap(place(fixture()));
 */
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import type { Result } from '../../core/errors.ts';
import { Master } from '../../core/cv.schema.ts';

export const FIXTURE_URL = new URL('../fixtures/cv.json', import.meta.url);

export const fixture = () => Master.parse(JSON.parse(readFileSync(FIXTURE_URL, 'utf8')));

export const unwrap = <Data>(result: Result<Data>) => {
  if (result.error !== null) throw result.error;
  return result.data;
};

export const codes = (result: Result<unknown>) =>
  result.error?.issues.map(issue => issue.code) ?? [];

export const photo = () => PNG.sync.write(new PNG({ width: 8, height: 8 }));
