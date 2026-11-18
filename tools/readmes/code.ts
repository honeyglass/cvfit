/**
 * The facts a folder README states, read from the code by the TypeScript compiler.
 *
 * Code, Edge, codeOf: the top-level folders, their files, and the imports between them.
 *
 * Only the compiler reads the code, never a pattern, so every import form it parses is seen.
 * An import() whose path is no literal is an issue, since nothing can tell where it leads.
 *
 * @example const { folders, files, edges } = codeOf(root);
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import * as issue from './issues.ts';
import type { Issue } from './issues.ts';

/** One import from a file in one top-level folder to a path outside that folder. */
export type Edge = { from: string; file: string; spec: string; to: string };

export type Code = {
  folders: string[];
  files: Map<string, string[]>;
  edges: Edge[];
  issues: Issue[];
};

/**
 * Reads every top-level folder; hidden folders and node_modules hold no code of the project.
 *
 * @param root - the repository root
 * @returns the folders sorted, each one's files as paths below it, and every import that leaves one
 */
export function codeOf(root: string): Code {
  const folders = foldersOf(root);
  const files = new Map(folders.map(folder => [folder, filesOf(root, folder)]));
  const issues: Issue[] = [];
  const edges = folders.flatMap(folder =>
    (files.get(folder) ?? [])
      .filter(file => file.endsWith('.ts'))
      .flatMap(file => edgesOf(root, folder, file, issues)),
  );
  return { folders, files, edges, issues };
}

function foldersOf(root: string) {
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && hidden(entry.name) === false)
    .map(entry => entry.name)
    .filter(name => name !== 'node_modules')
    .sort();
}

// Every file below a folder except its READMEs, which describe the files and are none of them.
function filesOf(root: string, folder: string) {
  return readdirSync(join(root, folder), { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name !== 'README.md')
    .map(entry => relative(join(root, folder), join(entry.parentPath, entry.name)).split(sep))
    .filter(parts => parts.some(hidden) === false)
    .map(parts => parts.join('/'))
    .sort();
}

const hidden = (name: string) => name.startsWith('.');

function edgesOf(root: string, folder: string, file: string, issues: Issue[]): Edge[] {
  const path = join(root, folder, file);
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest);
  const specs: string[] = [];
  collect(source, specs, () => issues.push(issue.dynamicImport(`${folder}/${file}`)));
  return specs
    .filter(spec => spec.startsWith('.'))
    .map(spec => ({ from: folder, file, spec, to: topOf(root, resolve(dirname(path), spec)) }))
    .filter(edge => edge.to !== folder);
}

/**
 * Walks the syntax tree for every path a file loads code from.
 *
 * Covers import and export declarations, import() calls and import('…').Type references.
 *
 * @param node - the node to search, the whole file at first
 * @param specs - collects each path as written
 * @param unreadable - called for an import() whose path is no literal
 */
function collect(node: ts.Node, specs: string[], unreadable: () => void) {
  const spec = specOf(node);
  if (spec === null) unreadable();
  if (typeof spec === 'string') specs.push(spec);
  ts.forEachChild(node, child => collect(child, specs, unreadable));
}

// A path as written, null for an import() no tool can follow, undefined for any other node.
function specOf(node: ts.Node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    const spec = node.moduleSpecifier;
    return spec !== undefined && ts.isStringLiteral(spec) ? spec.text : undefined;
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    const literal = node.argument.literal;
    return ts.isStringLiteral(literal) ? literal.text : undefined;
  }
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const [first] = node.arguments;
    return first !== undefined && ts.isStringLiteralLike(first) ? first.text : null;
  }
  return undefined;
}

// The top-level name a path lands in: a folder, a file at the root, or '..' outside of it.
function topOf(root: string, path: string) {
  return relative(root, path).split(sep)[0] ?? '';
}
