/**
 * The one function behind pnpm readmes: each folder README as it is, and as the code says it should be.
 *
 * Readme, Gap, Options, readmes: the READMEs, what each lacks, and the folders left out.
 *
 * Writing and checking are this same function, so the check can never disagree with the writer.
 * A gap is a module without its sentence, handed with the file's comments and imports to whoever
 * writes the sentence; the tool itself writes no prose.
 *
 * @example const { readmes: found, issues } = readmes(root, { skip: ['tests'] });
 */
import { existsSync, readFileSync } from 'node:fs';
import { trySync$ } from '@honeyglass/utils/ts';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { codeOf, docsOf } from './code.ts';
import type { Code, Docs } from './code.ts';
import * as issue from './issues.ts';
import type { Issue } from './issues.ts';
import { pageOf } from './markdown.ts';
import type { Page } from './markdown.ts';
import { rendered } from './render.ts';
import type { Facts, Link } from './render.ts';

export type Gap = Docs & { readme: string; file: string; imports: string[] };

export type Readme = {
  path: string;
  current: string;
  wanted: string;
  issues: Issue[];
  gaps: Gap[];
};

/** skip: top-level folders that get no README and stand in no other README's connections. */
export type Options = { skip: string[] };

/** The link schemes that lead out of the repository; any other scheme is refused. */
const EXTERNAL = new Set(['http:', 'https:', 'mailto:']);

/**
 * @param root - the repository root
 * @param options - the folders to leave out
 * @returns one entry per folder with code, and the issues of reading the code itself
 */
export function readmes(root: string, options: Options) {
  const code = codeOf(root);
  const skip = new Set(options.skip);
  const folders = code.folders.filter(
    folder => skip.has(folder) === false && hasCode(code, folder),
  );
  const found = folders.map(folder => readmeOf(root, code, folder, new Set(folders)));
  return { readmes: found, issues: code.issues };
}

function hasCode(code: Code, folder: string) {
  return (code.files.get(folder) ?? []).some(file => file.endsWith('.ts'));
}

function readmeOf(root: string, code: Code, folder: string, shown: Set<string>): Readme {
  const path = `${folder}/README.md`;
  const file = join(root, path);
  if (existsSync(file) === false)
    return { path, current: '', wanted: '', issues: [issue.noReadme(path)], gaps: [] };
  const current = readFileSync(file, 'utf8');
  const page = pageOf(current);
  const { text: wanted, issues } = rendered(path, current, page, factsOf(code, folder, shown));
  const wantedPage = pageOf(wanted);
  if (page.html) issues.push(issue.html(path));
  issues.push(...deadLinks(root, path, wantedPage));
  if (rendered(path, wanted, wantedPage, factsOf(code, folder, shown)).text !== wanted)
    issues.push(issue.unstable(path));
  const gaps = gapsOf(root, code, folder, wantedPage);
  issues.push(...gaps.map(gap => issue.noSentence(path, gap.file.slice(folder.length + 1))));
  return { path, current, wanted, issues, gaps };
}

// Only folders that get a README of their own stand in a connection, so every link resolves.
function factsOf(code: Code, folder: string, shown: Set<string>): Facts {
  const outgoing = code.edges.filter(edge => edge.from === folder && shown.has(edge.to));
  const incoming = code.edges.filter(edge => edge.to === folder && shown.has(edge.from));
  return {
    modules: code.files.get(folder) ?? [],
    uses: linksOf(outgoing, edge => edge.to),
    usedBy: linksOf(incoming, edge => edge.from),
  };
}

function linksOf(edges: Code['edges'], other: (edge: Code['edges'][number]) => string): Link[] {
  const files = new Map<string, Set<string>>();
  for (const edge of edges) {
    const inside = edge.target.slice(edge.to.length + 1);
    files.set(other(edge), (files.get(other(edge)) ?? new Set()).add(inside));
  }
  return [...files.keys()].sort().map(folder => ({
    folder,
    files: [...(files.get(folder) ?? [])].sort(),
  }));
}

// Each module whose bullet has no sentence yet, with what the code says about it.
function gapsOf(root: string, code: Code, folder: string, page: Page): Gap[] {
  const items = page.sections.find(section => section.title === 'Modules')?.items ?? [];
  return items
    .filter(item => item.label !== undefined && item.rest.trim() === '')
    .map(item => `${folder}/${item.label}`)
    .map(file => ({
      readme: `${folder}/README.md`,
      file,
      ...(file.endsWith('.ts') ? docsOf(join(root, file)) : { header: undefined, exports: [] }),
      imports: code.edges
        .filter(edge => `${edge.from}/${edge.file}` === file)
        .map(edge => edge.target),
    }));
}

/**
 * Every link of a README that leads nowhere: to no file, out of the repository, or to no heading.
 *
 * @param root - the repository root
 * @param path - the README's path from the root
 * @param page - the README as micromark reads it
 * @returns one issue per dead link
 */
function deadLinks(root: string, path: string, page: Page) {
  return page.links
    .filter(link => leadsNowhere(root, path, page, link.destination))
    .map(link => issue.deadLink(path, link.line, link.destination));
}

function leadsNowhere(root: string, path: string, page: Page, destination: string) {
  const scheme = /^[a-z][a-z\d+.-]*:/i.exec(destination)?.[0].toLowerCase();
  if (scheme !== undefined) return EXTERNAL.has(scheme) === false;
  const [file = '', anchor] = destination.split('#', 2);
  if (file === '') return anchor === undefined || page.slugs.has(decoded(anchor)) === false;
  const target = resolve(dirname(join(root, path)), decoded(file));
  const inside = relative(root, target);
  if (inside.startsWith('..') || isAbsolute(inside) || existsSync(target) === false) return true;
  if (anchor === undefined) return false;
  return target.endsWith('.md') === false || slugsAt(target).has(decoded(anchor)) === false;
}

const slugsAt = (path: string) => pageOf(readFileSync(path, 'utf8')).slugs;

// A link's text with its %-escapes undone; a broken escape stays as written and finds nothing.
function decoded(text: string) {
  const { data, error } = trySync$(() => decodeURIComponent(text));
  return error === null ? data : text;
}
