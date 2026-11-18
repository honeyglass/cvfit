/**
 * The problems pnpm readmes finds, each made by one function.
 *
 * Issue: one problem, with the file it lies in.
 * dynamicImport: what the reading of the code finds.
 *
 * Every issue fails the check: what the tool cannot read is a problem, never a skip.
 *
 * @example issues.push(issue.dynamicImport('cli/run.ts'));
 */

export type Issue = { code: string; path: string; message: string };

export const dynamicImport = (path: string): Issue => ({
  code: 'DYNAMIC_IMPORT',
  path,
  message: 'An import() names no fixed path, so no tool can tell which folder it reaches',
});
