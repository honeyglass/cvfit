# tools/

Tools for the people who maintain oriko; they are not part of the program you install.

**baselines/** keeps the showcase examples in step with the code. The examples are references:
the tests compare every new build against them. When a look changes on purpose,
`pnpm baselines:update` fetches new PDFs from Google Docs and draws new page images, but only
for the examples whose files changed.

How to set it up once: [Baselines](../docs/baselines.md).

## Modules

All files sit in `baselines/`.

- `update.ts`: the script behind `pnpm baselines:update`; it gets a new PDF and new page images
  for each changed .docx.
- `stale.ts`: finds each showcase .docx whose sha256 differs from the one in its `google.json`.
- `manifest.schema.ts`: the shape of `google.json`, one sha256 per .docx file name.
- `google.ts`: uploads a .docx to Google Docs, exports it as PDF and moves the Doc to the trash.
- `google.schema.ts`: the part of the gws answer that `google.ts` reads, the id of the new Doc.
- `gws.ts`: downloads the Google Workspace CLI once and runs it only when its sha256 matches.
- `images.swift`: draws the page images of a PDF, and the excerpt the main README shows.

## Example

```sh
pnpm baselines:update                # new PDFs and page images for every changed .docx
pnpm baselines:gws auth login        # hands its words to gws, here to sign in
```

The full sign-in, with the scope to use, stands in [Baselines](../docs/baselines.md).

## Connections

- **Uses:** [examples/](../examples/README.md) for the showcase files it reads and rewrites;
  gws for Google Docs, and the `swift` command of macOS for the images.
- **Used by:** the maintainer through the two pnpm scripts above.

---

[← Back to the README](../README.md)
