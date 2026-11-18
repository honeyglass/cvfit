# tools/

Tools for the people who maintain oriko; they are not part of the program you install.

**baselines/** renews the Google PDFs of the showcase examples, the references the tests compare
against. When a style changes on purpose and the showcase .docx files are built again,
`pnpm baselines:update` fetches a new PDF from Google Docs and draws new page images, but only for
each .docx that changed. It reads and rewrites the files in `examples/showcase/`, talks to Google
Docs through gws, the Google Workspace CLI, and draws the images with the `swift` command of macOS,
so it runs on macOS only. How to set it up once: [Baselines](../docs/baselines.md).

**readmes/** writes the facts of the code into every folder README: the files of the folder and
the imports between folders. `pnpm readmes --check` runs in the tests and fails on a README that
no longer matches the code. How it works: [readmes/](readmes/README.md).

## Modules

- `baselines/update.ts`: the script behind `pnpm baselines:update`; it gets a new PDF and new
  page images for each changed .docx.
- `baselines/stale.ts`: finds each showcase .docx that its `google.json` lacks or lists with
  another sha256.
- `baselines/manifest.schema.ts`: the shape of `google.json`, one sha256 per .docx file name.
- `baselines/gws.ts`: downloads gws, the Google Workspace CLI, once and runs it only when its
  sha256 matches; it is also the script behind `pnpm baselines:gws`.
- `baselines/google.ts`: uploads a .docx to Google Docs, exports it as PDF and moves the Doc to
  the trash.
- `baselines/google.schema.ts`: the part of the gws answer that `google.ts` reads, the id of the
  new Doc.
- `baselines/images.swift`: draws the page images of a PDF, and the excerpt the main README shows.
- `readmes/code.ts`: lists the top-level folders, their files, and every import from one folder
  to another.
- `readmes/issues.ts`: the problems the reading of the code finds, such as an `import()` without
  a fixed path.
- `readmes/markdown.ts`: reads a README with micromark: its sections, the file bullets, the links
  and the anchors of its headings.
- `readmes/readmes.ts`: the one function behind writing and checking; it also finds dead links
  and the files that still lack a sentence.
- `readmes/render.ts`: writes the file names and the connections into a README and keeps every
  sentence.
- `readmes/update.ts`: the script behind `pnpm readmes`; it writes the READMEs, or with `--check`
  only compares them.

## Example

```sh
pnpm baselines:update                # new PDFs and page images for every changed .docx
pnpm baselines:gws auth login        # passes its arguments to gws, here to sign in
pnpm readmes --check                 # fails when a folder README no longer matches the code
```

The full sign-in, with the scope to use, stands in [Baselines](../docs/baselines.md).

## Connections

- **Uses:** nothing outside itself.
- **Used by:** no folder.

---

[← Back to the README](../README.md)
