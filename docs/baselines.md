# 🧪 Baselines

The showcase in `examples/showcase/` holds the baselines the tests compare against: the built
`.docx` files, and the PDFs Google Docs made from them. When a style changes on purpose, build
the `.docx` files again, then let `pnpm baselines:update` fetch new PDFs and page images.

```sh
pnpm baselines:update
```

It asks Google only for a `.docx` whose sha256 differs from the one in the `google.json` beside
it, and a test fails while a hash does not match. Only a maintainer who changes a style needs
this; building, previewing and testing oriko need no Google account.

## What it needs

- **macOS** for now: `tools/baselines/gws.ts` has gws archives for macOS only, and
  `tools/baselines/images.swift` draws the page images with PDFKit.
- **gws**, the Google Workspace CLI: `pnpm baselines:gws` downloads its release archive once and
  runs it only when the archive's sha256 matches the table in `tools/baselines/gws.ts`.
- **A Google account** that gws is signed in to, with the Drive API in a Google Cloud project.

## Sign in once

1. In the [Google Cloud Console](https://console.cloud.google.com/), create a project and
   enable the **Google Drive API** in it.
2. Under Google Auth Platform, set up the consent screen as **External**, and add your own
   Google account as a **test user**.
3. Create an OAuth client of type **Desktop app**, and save its JSON as
   `~/.config/gws/client_secret.json`. With the gcloud CLI installed,
   `pnpm baselines:gws auth setup` creates the project and asks for the client instead.
4. Sign in with the narrowest right, which reaches only the files gws creates itself:

   ```sh
   pnpm baselines:gws auth login --scopes https://www.googleapis.com/auth/drive.file
   ```

5. On Google's consent page, tick the box for the Drive files; Google leaves it unticked.

> [!WARNING]
> gws keeps the access token of an earlier sign-in in `~/.config/gws/token_cache.json`. When a
> call still fails with "insufficient authentication scopes" after a new sign-in, move that file
> aside; gws fetches a fresh token on the next call.

---

[← Back to the README](../README.md)
