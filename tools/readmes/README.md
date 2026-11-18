# tools/readmes/

Keeps every folder README true to the code: `pnpm readmes` writes the facts, a person or an agent
writes the sentences, and `pnpm readmes --check` fails as soon as the two drift apart.

## How it works

Three parts work together, and only the last one writes prose.

1. **The code.** The TypeScript compiler reads every `.ts` file: which files a folder holds, and
   which files of another folder it imports. It reads the code as the compiler does, so no form
   of import slips past it.
2. **The README.** micromark, the reference parser of CommonMark, reads each folder README as
   GitHub shows it: its sections, its file bullets, its links and the anchors of its headings.
3. **The writer.** A file without a sentence is a gap. The tool prints each gap as JSON, with the
   comments and imports of that file, and the person or agent writes the sentence from it.

Writing and checking are one function, so the check can never disagree with what was written.

## What the tool owns

In a folder README the tool writes two things and leaves everything else alone:

- **The file names in `## Modules`.** A new file gets a bullet without a sentence, a removed one
  loses its bullet, and every sentence stays as written.
- **All of `## Connections`.** Which folders this one imports from, and which import from it,
  each with the files the imports reach.

A README also needs `## Example`. The tool checks that the section is there, not what it shows.

## What fails the check

- a README that differs from what `pnpm readmes` would write
- a file without a sentence
- a link to a file or heading that does not exist, or out of the repository
- a README without one of the three sections, or with one of them twice
- a `## Modules` that is not one flat list of `` - `file`: sentence ``, which the tool leaves
  untouched rather than guess
- HTML in a README, since no Markdown parser sees the links inside it
- an `import()` whose path is no fixed text, since nothing can tell where it leads

## What it cannot check

- whether a sentence is true; that needs a review
- code that is not TypeScript, such as `install.sh` or `images.swift`; what they connect stands
  as prose in the README of the folder
- a file read by its path instead of imported, such as the pictures in `assets/`

## Example

```sh
pnpm readmes            # writes the facts, prints the gaps as JSON
pnpm readmes --check    # writes nothing, fails on any difference or gap
```

The folders the tool leaves out stand in `SKIP` in `update.ts`; `tests/` is one of them, since its
own README lists what the tests use.

---

[← Back to tools/](../README.md)
