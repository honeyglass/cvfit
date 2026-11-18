# tools/

Tools for the people who maintain oriko; they are not part of the program you install.

**baselines/** renews the Google PDFs of the showcase examples, the references the tests compare
against. When a style changes on purpose and the showcase .docx files are built again,
`pnpm baselines:update` fetches a new PDF from Google Docs and draws new page images, but only for
each .docx that changed. It runs on macOS only. How to set it up once:
[Baselines](../docs/baselines.md).

**readmes/** reads the folders of the repository with the TypeScript compiler: their files and
the imports between them. The layout test checks the import rules of CLAUDE.md with it.

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

## Example

```sh
pnpm baselines:update                # new PDFs and page images for every changed .docx
pnpm baselines:gws auth login        # passes its arguments to gws, here to sign in
```

The full sign-in, with the scope to use, stands in [Baselines](../docs/baselines.md).

## Connections

- **Uses:** [examples/](../examples/README.md) for the showcase files it reads and rewrites;
  gws for Google Docs, and the `swift` command of macOS for the images.
- **Used by:** the maintainer through the two pnpm scripts above.

---

[← Back to the README](../README.md)
