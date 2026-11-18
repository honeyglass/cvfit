# core/

What every feature shares: the shape of a CV, the rules it must follow, and how pages are planned.

A CV enters oriko as a JSON file. Before anything uses it, `core/` checks it in layers, the shape
first, and refuses it with every problem of the first layer that fails. It then plans the pages:
which block stands on which page, each block whole, with heights estimated from the text. The
classic and the terminal style (`--style`) both build on that plan, so the preview and the files
always agree.

It also holds what several features need alike: reading and writing files safely, finding the
data folder, the options of the commands, and the one shape of an error. `core/` imports nothing
from the other folders, so every feature can rely on it.

## Modules

- `cv.schema.ts`: describes the shape of a CV, a profile and every kind of block, and refuses a
  text with hidden characters.
- `cv.limits.ts`: lists the four block kinds, the column each one sits in, the contact icons and
  the largest sizes a CV may have.
- `check.ts`: checks a CV and its profile, applies the profile, and gives back the CV to build or
  the list of problems.
- `home.ts`: finds the CVs in `cvs/` and the profiles in `profiles/` of the data folder, and picks
  the CV a command works on.
- `load.ts`: reads the CV and the profile a command names, and checks them in one step.
- `files.ts`: reads files and pipes up to a size limit, writes all files of one command or none,
  and keeps a photo inside the data folder.
- `files.limits.ts`: sets how large the JSON input, a photo, and a posting, notes or an old CV may
  be.
- `metrics.ts`: holds every distance of the page, so the estimate and the finished file use the
  same numbers.
- `measure.ts`: estimates how tall a block is from its text alone.
- `place.ts`: plans the pages: it puts each block whole on a page, or names the blocks that do not
  fit.
- `zip.ts`: makes a finished .docx the same bytes for the same input, and sets the photo line so
  Google Docs lays it out right.
- `options.ts`: lists every option of every command, and writes an option with its value quoted
  for a shell.
- `errors.ts`: holds the one error shape, a refusal that lists every issue, and the `Result` that
  holds either `data` or an `error`. [docs/cli.md](../docs/cli.md#a-refusal) shows how a refusal
  reads.
- `issues.ts`: makes each issue that `core/` or several folders raise, one function per issue.

## Example

```ts
import { checked } from '../core/load.ts';
import { place } from '../core/place.ts';

const cv = await checked(home, cvName, profileName);
if (cv.error !== null) return cv;
const plan = place(cv.data);
```

A feature checks the CV first and plans the pages from it; each step gives back either `data` or
an `error` to pass on.

## Connections

- **Uses:** nothing outside itself.
- **Used by:**
  - [cli/](../cli/README.md): loads, checks and plans the CV, reads the options, writes the files.
  - [cv/](../cv/README.md): checks and plans a CV, lists the CVs and shows their blocks.
  - [profile/](../profile/README.md): checks a profile against its CV and plans its pages.
  - [edit/](../edit/README.md): checks and plans every change to a CV, and saves it.
  - [read/](../read/README.md): reads files and downloads up to a limit, picks the CV that notes
    belong to, and writes what it read.
  - [classic/](../classic/README.md) and [terminal/](../terminal/README.md): build the .docx from
    the page plan, the page distances and `stable()` of `zip.ts`; terminal/ also draws the
    preview, and classic/ stores the photo in the data folder.
  - [pdf/](../pdf/README.md): the error shape and the codes of a refusal.
  - [bin/](../bin/README.md): reads the input piped into the command.

---

[← Back to the README](../README.md)
