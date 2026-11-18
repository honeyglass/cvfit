# oriko

A CLI that keeps master CVs as JSON, tailors one profile per job posting, and builds .docx and PDF.

## Folders

The code is cut by feature, not by layer, so a change to one feature touches one folder.
bin/oriko.ts never moves: install.sh links to it. tools/ holds maintainer tools, not part of the CLI.

## Import rules

A feature folder (cv, profile, edit, read, classic, terminal, pdf) imports only from core/ and from
itself, and core/ only from core/, so features stay independent and core stays a base. cli/ is the
shell and the only folder that combines several features. tests/api/layout.api.spec.ts checks these
rules and fails on a forbidden import; every new top-level folder with code counts as a feature.

## Adding something

- A new feature is a new folder; add it to "include" in tsconfig.json.
- A file two features need moves to core/.
- A folder's constants sit in its limits.ts; core/ names them by topic, such as cv.limits.ts.
- A folder's issues sit in its issues.ts; callers import it as a namespace and call issue.name(). An issue two folders raise goes to core/issues.ts.

## Folder READMEs

Every top-level folder has a README.md that tells a person, in plain words, what the folder is for
and how it fits the rest. A folder with code lists its modules, one sentence each, shows one short
example, and names the folders it uses and the folders that use it; tests/ alone lists what the
tests cover. When a change alters what a folder does, which modules it has, or how it connects to
other folders, update that folder's README in the same commit. A new top-level folder gets one too.

## Checks

Run pnpm test, pnpm typecheck and pnpm run format:check before a commit.
