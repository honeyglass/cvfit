<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/header-dark.svg">
  <img src="brand/header.svg" alt="oriko" width="520">
</picture>

**One CV, made to fit every job posting, laid out so no job ever breaks across a page.**

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg)
![Node](https://img.shields.io/badge/node-24+-brightgreen.svg)
![Agent-driven](https://img.shields.io/badge/CLI-agent--driven-purple.svg)

</div>

---

## 📄 What is oriko?

oriko makes a fitting version of your CV for every job you apply to. You write your CV once,
with your jobs, skills, languages and contact details. When you find a job you like, you give the
posting to an AI assistant, in plain words and in any language. The assistant fits your CV to
it: it moves the matching skills up, hides what does not help and shortens long lists, and it
never invents anything. You see the result right away as a preview of every page in the
terminal, and you get a Word file that you open in Google Docs and save as PDF.

### Why oriko?

- 🤖 **Built for AI assistants**: oriko is a command-line tool an AI agent can drive on its own,
  from the first look at your CV to the finished file.
- 🧱 **Clean pages**: a job never breaks across two pages. If it does not fit, it moves to the next
  page as a whole.
- 🎯 **One CV, many versions**: each job posting gets a small version file. Add a new job to your
  CV once, and every version has it.
- ✅ **Honest by design**: a version only hides, reorders and shortens what you wrote. New claims
  need your yes.
- 👀 **Preview before you build**: see every page in the terminal, and how full it is.
- 🌍 **Several CVs**: one per language or per person, side by side.
- 🛡️ **Safe dependencies**: oriko takes in a new version of a package (code from other people)
  only once it is three days old, so a bad release is usually caught first. Packages may not run
  their own programs while they install, and every version is fixed, so every install gets the
  same code.

## 🚀 Quickstart

```sh
curl -fsSL https://raw.githubusercontent.com/honeyglass/oriko/main/install.sh | sh
```

### Manual installation

```sh
git clone https://github.com/honeyglass/oriko.git
cd oriko
pnpm install --frozen-lockfile
node bin/oriko.ts schema
```

## 🤖 Working with oriko and an agent

Open [Claude Code](https://claude.com/claude-code) and say what you want. The skill in
[`.claude/skills/oriko/`](.claude/skills/oriko/SKILL.md) tells the agent how to use oriko. After a
manual installation, open Claude Code in the oriko folder.

```text
Fit my CV to this job: <paste the job posting>
Create a new CV for me. Since 03/2021 I have worked as a data engineer at …
```

**What the agent does for a job posting:**

1. Picks your CV in the language of the posting.
2. Reads the parts of your CV that matter for this job.
3. Writes a version: matching skills first, unrelated old jobs hidden, long lists shortened.
4. Checks that every block fits on the pages, and fixes it if not.
5. Builds the Word file and shows you the preview, every change, and why it made it.
6. Tells you what the posting asks for that your CV does not show yet.

No CV yet? Paste a job posting anyway. The agent asks you a few short questions (your name, where
you live, where you have worked, what you can do), creates your CV from your answers, and then
fits it to the posting.

## 🧩 Built for agents

oriko has two parts. The **CLI** does the work and checks every input. The **skill** in
[`.claude/skills/oriko/`](.claude/skills/oriko/SKILL.md) is the agent's manual: which command to
run when, what it may change, and when it stops and asks you.

### The skill: a fixed flow

The skill is a fixed list of steps, and for each step the steps that may follow (a state machine).
It has two paths. To fit a CV to a posting, the agent reads the posting, inspects
your CV, drafts a version, checks it, builds it and reports. To write a CV, it sorts your facts,
writes them, checks them and hands over; with no CV at all, it first asks you a few short
questions. The agent moves only along the listed steps. When oriko refuses a draft, the agent goes back
one step and fixes it, at most three times; then it stops and asks you. Every step and its rules
stand in [the skill](.claude/skills/oriko/SKILL.md).

### The CLI: Agent DX rules

DX stands for developer experience: how easy a tool is to use. Agent DX asks the same question for
an AI agent, which cannot click through a menu or guess what a vague error means. The rules start
from Justin Poehnelt's article
[Rewrite your CLI for AI agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/)
(2026), with the [Google Workspace CLI](https://github.com/googleworkspace/cli) as its reference
implementation. [The CLI page](docs/cli.md) lists every rule oriko follows, its commands, and a
refusal as the agent reads it.

## 🖥️ Terminal preview

**See your CV before the file exists.** `oriko preview` draws every page in the terminal, the left
column beside the right one, as in the finished document:

<img src="examples/showcase/go-e-senior-backend/terminal-excerpt.png" width="100%" alt="The top of page 1 of Jane Doe's CV as the terminal preview draws it">

<details>
<summary><b>The same preview as text</b></summary>

```text
╭─ Page 1 of 3 ────────── github.com/honeyglass/oriko ─┬───────────────────────────╮
│                                                      │                           │
│   ╭───────┐                                     Jane │ CONTACT ───────────────── │
│   │       └┐                                     Doe │                           │
│   │ ●   ●  │                 Senior Backend Engineer │ Germany, Berlin           │
│   │•  ◡   •│                                         │ Example Street 1          │
│   │ ── ─── │                                         │ 10115 Berlin              │
│   ╰────────╯                                         │ +49 (0) 30 000 000        │
│                                                      │ jane.doe@example.com      │
│                                                      │ Profile »                 │
│                                                      │                           │
│ PROFESSIONAL EXPERIENCE ──────────────────────────── │ SKILLS ────────────────── │
│                                                      │                           │
│ ● Senior Backend Engineer            03/2021 – today │ Programming Languages     │
│ │                                                    │   Go                ●●●●● │
│ │ Northwind Logistics GmbH · Berlin (DE)             │   TypeScript        ●●●●○ │
│ │ › Rebuilt the shipment tracking service in Go      │   SQL               ●●●●○ │
│ │   for ten times the load, at 40,000 events per     │   Java              ●●●○○ │
│ │   second                                           │   Rust              ●●○○○ │
├──────────────────────────────────────────────────────┴───────────────────────────┤
│ Left  ■■■■■■■■□□ 84 % full     Right ■■■■■■■■■■ 97 % full                        │
╰──────────────────────────────────────────────────────────────────────────────────╯
```

</details>

```sh
oriko preview --profile go-e-senior-backend   # the version for one job posting
oriko preview --cv jane-doe                   # your CV as it stands
```

**Send the preview as a CV.** `build --style terminal` writes the sheets as a Word file, one A4
page each, set in Fira Code so Google Docs keeps every character in its column. Send the classic
file to managers and the terminal file to developers:

```sh
oriko build --profile go-e-senior-backend --style terminal --out go-e-terminal.docx
```

What each mark of the preview means: [the terminal preview page](docs/terminal-preview.md).

## 🗂️ Your data

Your CVs live outside the repository, in `~/.oriko`; `--home <folder>` points oriko at another one.

```text
~/.oriko/
  cvs/jane-doe.json           your CV: language, person, contact, pages, blocks
  cvs/jane-doe.png            its photo
  profiles/backend-job.json   one version per job posting, naming its CV in "cv"
```

## 🔌 Compatibility

- **Google Docs**: the layout is tuned to how Google Docs sets the file, with Open Sans and
  Calibri. Open the Word file there and save it as PDF.
- ⚠️ **Word and LibreOffice** set the same file with other line breaks, so a block that fits in
  Google Docs may spill over to the next page.
- **Terminal style**: set in Fira Code, which Google Docs offers, so every character keeps its
  column.
- **Terminal preview**: every line is 84 characters wide; a narrower terminal breaks the lines.
- **Node**: 24 or newer, which runs the TypeScript files of oriko as they are.
- **Install script**: macOS and Linux. Windows is not tested; use the manual installation there.
- **Agents**: the skill is written for Claude Code. Any other agent that can run a command, such
  as Codex or Gemini CLI, can use the CLI through `oriko schema`.

## 📖 Docs

- [**Examples**](docs/examples.md)
- [**By hand**](docs/by-hand.md)
- [**Sample data**](docs/sample-data.md)
- [**CLI**](docs/cli.md)
- [**Terminal preview**](docs/terminal-preview.md)
- [**Good to know**](docs/good-to-know.md)
- [**Security**](SECURITY.md)
- [**Agent skill**](.claude/skills/oriko/SKILL.md)

## 🛠️ Development

```sh
pnpm test             # api and internals tests
pnpm run typecheck
pnpm run format:check
sh tests/e2e/install.e2e.sh   # the install script in empty home folders
```

## ⚖️ License

Copyright (C) 2026 Serkan Sipahi. oriko is free software under the
[GNU Affero General Public License v3.0](LICENSE): you may use, change and share it. Anyone who
shares a changed version, or offers one as a service over a network, must publish its source
under the same license.

The name oriko and the Oriko character are not covered by this license. That includes the
files in [`brand/`](brand/) and the Oriko drawing the preview shows; all rights to them stay
with the author. A changed version of oriko needs another name and logo.
