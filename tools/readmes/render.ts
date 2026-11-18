/**
 * A README as it should be: its own sentences kept, the facts from the code written in.
 *
 * Facts, Link, rendered: what the code says about a folder, and the README with it written in.
 *
 * The tool owns the file names of "## Modules" and all of "## Connections"; the sentence after
 * each name, and every other part of the README, belong to whoever writes the text.
 *
 * @example const { text, issues } = rendered('cli/README.md', current, pageOf(current), facts);
 */
import * as issue from './issues.ts';
import type { Issue } from './issues.ts';
import type { Item, Page, Section } from './markdown.ts';

/** Another folder, and the files of the folder the import lands in. */
export type Link = { folder: string; files: string[] };

export type Facts = { modules: string[]; uses: Link[]; usedBy: Link[] };

/** The sections every README of a folder with code has. */
const SECTIONS = ['Modules', 'Example', 'Connections'];
const WIDTH = 100;

/**
 * @param path - the README's path from the root, for the issues
 * @param text - the README as it stands
 * @param page - the same README as micromark reads it
 * @param facts - what the code says about the folder
 * @returns the README to write, unchanged when one of its sections cannot be read
 */
export function rendered(path: string, text: string, page: Page, facts: Facts) {
  const found = SECTIONS.map(title => page.sections.filter(section => section.title === title));
  const issues: Issue[] = SECTIONS.flatMap((title, index) =>
    sectionIssues(path, title, found[index]),
  );
  const [modules, , connections] = found.map(sections => sections[0]);
  if (issues.length > 0 || modules === undefined || connections === undefined)
    return { text, issues };
  if (modules.items === undefined)
    return { text, issues: [issue.unreadableSection(path, 'Modules')] };
  const items = moduleItems(modules.items, facts.modules);
  const bodies = [
    { section: modules, body: items.map(item => `- \`${item.label}\`:${item.rest}`) },
    { section: connections, body: connectionLines(facts) },
  ];
  // From the last section up, so a body that changes length moves no section still to come.
  const lines = text.split('\n');
  for (const { section, body } of bodies.sort((a, b) => b.section.line - a.section.line))
    lines.splice(section.line + 1, section.end - section.line - 1, '', ...body, '');
  return { text: lines.join('\n'), issues };
}

function sectionIssues(path: string, title: string, sections: Section[]) {
  if (sections.length === 0) return [issue.noSection(path, title)];
  return sections.length > 1 ? [issue.twoSections(path, title)] : [];
}

// The bullets in their order, a removed file's bullet dropped, a new file's appended without text.
function moduleItems(items: Item[], files: string[]) {
  const kept = items.filter(item => item.label !== undefined && files.includes(item.label));
  const named = new Set(kept.map(item => item.label));
  const added = files.filter(file => named.has(file) === false);
  return [...kept, ...added.map(label => ({ label, rest: '' }))];
}

function connectionLines(facts: Facts) {
  return [
    ...linkLines('Uses', 'nothing outside itself.', facts.uses),
    ...linkLines('Used by', 'no folder.', facts.usedBy),
  ];
}

function linkLines(name: string, none: string, links: Link[]) {
  if (links.length === 0) return [`- **${name}:** ${none}`];
  const lines = links.map(link => {
    const files = link.files.map(file => `\`${file}\``).join(', ');
    return wrapped(`  - [${link.folder}/](../${link.folder}/README.md): imports ${files}`);
  });
  return [`- **${name}:**`, ...lines];
}

// A generated line broken at spaces before the width, continued under the text of its bullet.
function wrapped(line: string) {
  const [first = '', ...words] = line.trim().split(' ');
  const lines: string[] = [];
  let current = `  ${first}`;
  for (const word of words) {
    const fits = current.length + 1 + word.length <= WIDTH;
    if (fits === false) lines.push(current);
    current = fits ? `${current} ${word}` : `    ${word}`;
  }
  return [...lines, current].join('\n');
}
