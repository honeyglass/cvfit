/**
 * The facts a folder README states, read from the code by the TypeScript compiler.
 *
 * Code, Edge, codeOf: the top-level folders, their files, and the imports between them.
 * Docs, docsOf: the doc comments of one file, as material for whoever writes its sentence.
 *
 * Only the compiler reads the code, never a pattern, so every import form it parses is seen.
 * An import() whose path is no literal is an issue, since nothing can tell where it leads.
 *
 * @example const { folders, files, edges } = codeOf(root);
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import * as issue from './issues.ts';
import type { Issue } from './issues.ts';

/** One import from a file in one top-level folder to a path outside that folder. */
export type Edge = { from: string; file: string; spec: string; target: string; to: string };

export type Code = {
  folders: string[];
  files: Map<string, string[]>;
  edges: Edge[];
  issues: Issue[];
};

export type Docs = { header: string | undefined; exports: { name: string; doc: string }[] };

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

/**
 * The header and the comments of the exported names of one file, raw as they stand.
 *
 * @param path - the path of a .ts file
 * @returns the comment above the first line of code, and each export that has one of its own
 */
export function docsOf(path: string): Docs {
  const text = readFileSync(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const header = headerOf(text);
  const exports = source.statements.flatMap(statement =>
    exportDocs(statement, source, header?.pos),
  );
  return { header: header?.text, exports };
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
    .map(spec => edgeOf(root, folder, file, spec))
    .filter(edge => edge.to !== folder);
}

// The target as a path from the root with /, and its first part: a folder, a root file, or '..'.
function edgeOf(root: string, folder: string, file: string, spec: string): Edge {
  const resolved = resolve(join(root, folder, file, '..'), spec);
  const target = relative(root, resolved).split(sep).join('/');
  return { from: folder, file, spec, target, to: target.split('/')[0] ?? '' };
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

// The comment at the very start of a file, after a shebang, when it is a doc comment.
function headerOf(text: string) {
  const start = ts.getShebang(text)?.length ?? 0;
  const [first] = ts.getLeadingCommentRanges(text, start) ?? [];
  if (first === undefined) return undefined;
  const comment = text.slice(first.pos, first.end);
  return comment.startsWith('/**') ? { pos: first.pos, text: comment } : undefined;
}

// The names one statement exports with the doc comment right above it, never the file header.
function exportDocs(statement: ts.Statement, source: ts.SourceFile, header: number | undefined) {
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
  const exported = modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
  const doc = ts
    .getJSDocCommentsAndTags(statement)
    .filter(ts.isJSDoc)
    .filter(jsDoc => jsDoc.getStart(source) !== header)
    .at(-1);
  if (exported !== true || doc === undefined) return [];
  return namesOf(statement, source).map(name => ({ name, doc: doc.getText(source) }));
}

function namesOf(statement: ts.Statement, source: ts.SourceFile) {
  if (ts.isVariableStatement(statement))
    return statement.declarationList.declarations.map(item => item.name.getText(source));
  const name = namedDeclaration(statement) ? statement.name : undefined;
  return name === undefined ? [] : [name.getText(source)];
}

function namedDeclaration(statement: ts.Statement) {
  return (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  );
}
