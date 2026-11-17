/**
 * The one error of this package: a refusal that lists every issue of the input.
 *
 * Issue: one thing wrong with the input, with its path and a hint that says how to fix it; a
 * command, when there is one, answers the values that fix it, and the hint says to run it.
 * Rejection: the refusal error that carries the issues.
 * Result: the shape every public function answers in.
 * done, rejected: a result with data, and a result refused for its issues.
 *
 * @example if (issues.length > 0) return rejected('check', issues);
 */
import { RefusalError } from '@honeyglass/utils/ts';
import type { Refusal } from '@honeyglass/utils/ts';

export type Issue = { code: string; path: string; message: string; hint: string; command?: string };

export class Rejection extends RefusalError {
  readonly refusal: Refusal;
  readonly issues: Issue[];

  constructor(refusal: Refusal, issues: Issue[]) {
    super(refusal);
    this.refusal = refusal;
    this.issues = issues;
  }
}

export type Result<Data> = { data: Data; error: null } | { data: null; error: Rejection };

export const done = <Data>(data: Data): Result<Data> => ({ data, error: null });

/**
 * A result refused as `fix`: the caller corrects its input and calls again.
 *
 * @param step - where it failed, in lowercase words, such as 'block move'
 * @param issues - every issue found, so one call shows them all
 * @param cause - the original error, when another one led to the refusal
 * @returns the refused result
 */
export const rejected = (
  step: string,
  issues: Issue[],
  cause?: unknown,
): { data: null; error: Rejection } => {
  const refusal: Refusal = {
    kind: 'fix',
    step,
    reason: `the input has ${issues.length} issue(s)`,
    next: 'fix every listed issue and call again',
    state: 'Nothing was written.',
    cause,
  };
  return { data: null, error: new Rejection(refusal, issues) };
};
