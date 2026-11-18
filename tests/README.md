# tests/

The checks that prove oriko still does what it promises, run with `pnpm test`.

- **api/** tests what a caller sees: the commands, their answers and the files they write. Most
  tests live here.
- **internals/** tests a part the commands cannot reach on their own, such as the height estimate.
- **e2e/** runs the installer in empty home folders, as a new user would.
- **fixtures/** and **utils/** hold the reference CV and the helpers the tests share.

Some tests compare new builds with the showcase files in `examples/`, so a change to a look shows
up here first.

## Modules

- `api/`: one spec file per topic, named `*.api.spec.ts`. The ones to know first:
  - `layout.api.spec.ts`: fails when a folder imports from a folder it must not.
  - `run.api.spec.ts`: runs the commands, and checks that each example builds the very .docx
    of the showcase.
  - `pdf.api.spec.ts`: checks that the PDF through LibreOffice shows the lines of the Google PDF;
    it is skipped without LibreOffice.
  - `stale.api.spec.ts`: fails when a showcase .docx no longer matches the hash of its Google PDF.
- `internals/`: checks the estimate of how many lines a text takes against measured widths.
- `e2e/`: `install.e2e.sh` runs `install.sh` in empty home folders; `pnpm test` leaves it out.
- `fixtures/`: `cv.json`, the reference CV most tests start from.
- `utils/`: helpers that run oriko in a temporary data folder, build test documents, read the
  lines of a PDF, and stand in for the network and LibreOffice.

## Example

```sh
pnpm test                                  # api and internals, fails below 95 % coverage
node --test tests/api/layout.api.spec.ts   # one spec file
sh tests/e2e/install.e2e.sh                # the installer test
```

When `stale.api.spec.ts` fails after a change to a look, renew the PDFs as
[Baselines](../docs/baselines.md) shows.

## Connections

- **Uses:** [core/](../core/README.md), [cli/](../cli/README.md),
  [classic/](../classic/README.md), [terminal/](../terminal/README.md), [pdf/](../pdf/README.md),
  [read/](../read/README.md), [edit/](../edit/README.md) and [tools/](../tools/README.md), the
  code under test; [examples/](../examples/README.md) for the showcase files to compare with.
- **Used by:** `pnpm test` and the `checks` job of `.github/workflows/ci.yml`; its `install` job
  runs `tests/e2e/install.e2e.sh`.

---

[← Back to the README](../README.md)
