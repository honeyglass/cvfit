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

### oriko vs editing a document by hand

| Task | Word or Google Docs by hand | **oriko** |
| :--- | :--- | :--- |
| **Add a job** | ⚠️ move text boxes and lines yourself | ✅ one command; everything below moves down |
| **A version per job posting** | ❌ copy the document, edit every copy | ✅ a small file with the changes |
| **Change all versions** | ❌ in every copy | ✅ once, in your CV |
| **Page breaks** | ⚠️ checked by eye, after the edit | ✅ planned before the file exists |
| **Work with an AI assistant** | ❌ copy and paste | ✅ the assistant runs oriko itself |
| **Stay truthful** | ⚠️ up to you | ✅ nothing is added that you did not say |

## 📦 Installation

oriko needs Node 24 or newer and pnpm.

```sh
git clone git@github.com:honeyglass/oriko.git
cd oriko
pnpm install --frozen-lockfile
node bin/oriko.ts schema
```

> [!NOTE]
> You do not compile anything first: Node 24 runs the TypeScript files of oriko as they are. The
> examples below write `oriko` for `node bin/oriko.ts`.

## 🤖 Working with an agent

Open [Claude Code](https://claude.com/claude-code) in this folder and say what you want. The skill
in [`.claude/skills/oriko/`](.claude/skills/oriko/SKILL.md) tells the agent how to use oriko.

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
one step and fixes it, at most three times; then it stops and asks you.

### The CLI: Agent DX rules

DX stands for developer experience: how easy a tool is to use. Agent DX asks the same question for
an AI agent, which cannot click through a menu or guess what a vague error means. The rules start
from Justin Poehnelt's article
[Rewrite your CLI for AI agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/)
(2026), with the [Google Workspace CLI](https://github.com/googleworkspace/cli) as its reference
implementation. The rules marked ➕ oriko are new: the author of oriko added them from building
tools for agents.

| Rule | What oriko does | Why it helps the agent | Source |
| :--- | :--- | :--- | :--- |
| Raw JSON input | takes its whole input as one JSON object | passes the data as it is, without many flags | article |
| Schema at runtime | `oriko schema` shows every command and its input | looks the format up in the tool itself | article |
| JSON when piped | text for people, JSON for programs | each reader gets what it can read | article |
| Input hardening | the Word file and photos stay inside their folder | a mistake never writes elsewhere | article |
| Dry runs | `--dry-run` says what would happen | tries a command safely first | article |
| Agent skill | the agent's manual ships with the code | knows when to stop and ask you | article |
| Checks in layers | shape, then version, then pages; all errors at once | fixes real errors in one go | ➕ oriko |
| Errors with a hint | each error says where and what to change | fixes the input on its own | ➕ oriko |
| All or nothing | a refused command writes nothing | no file is left half changed | ➕ oriko |
| Exit codes 0, 1, 2 | 0 ok, 1 fix the input, 2 something broke | knows the next step from one number | ➕ oriko |
| Plan before the file | `plan` shows which block lands on which page | fixes an overflow before building | ➕ oriko |

<details>
<summary><b>⌨️ CLI commands</b></summary>

Every command answers one JSON object: on one line when another program reads it, indented in a
terminal, where `preview` shows its sheets and a refusal shows as readable lines. oriko ends with
exit code 0 when all went well, 1 when the input needs a fix (each issue with a hint), and 2 when
something broke. `oriko schema` lists every command and option, `oriko schema <command>` the input
one accepts.

| Command | What it does |
| :--- | :--- |
| `cvs`, `profiles` | list your CVs and versions, and whether each one fits its pages |
| `show` | outline of a CV; `--block <id>` shows one block in full |
| `plan`, `preview` | the page plan as JSON, or as the sheets above |
| `build --out <file>.docx` | writes the Word file; `--style terminal` in the look of the preview, `--dry-run` writes nothing |
| `init`, `cv update` | create a CV, change its language, pages, person or contact title |
| `block …`, `item …`, `contact …` | add, update, remove and move blocks, their items and contact lines |
| `photo set <file>` | stores a PNG or JPEG as the square photo of a CV, or of one version |

</details>

A refusal the agent reads and acts on:

```json
{
  "ok": false,
  "kind": "fix",
  "issues": [
    {
      "code": "PAGE_OVERFLOW",
      "path": "pages",
      "message": "These blocks of the left column land after page 1: campus",
      "hint": "Hide or shorten blocks of the left column, remove a page pin, or raise \"pages\""
    }
  ]
}
```

`"ok": false` means oriko refused. `"kind": "fix"` says the agent can fix the input itself. Each
issue has a `code` the agent can check, a `path` to the wrong value, a `message` for people and a
`hint` on what to change.

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
│ PROFESSIONAL EXPERIENCE ──────────────────────────── │                           │
│                                                      │                           │
│ ● Senior Backend Engineer            03/2021 – today │ SKILLS ────────────────── │
│ │                                                    │                           │
│ │ Northwind Logistics GmbH · Berlin (DE)             │ Programming Languages     │
│ │ › Rebuilt the shipment tracking service in Go      │   Go                ●●●●● │
│ │   for ten times the load, at 40,000 events per     │   TypeScript        ●●●●○ │
│ │   second                                           │   SQL               ●●●●○ │
│ │ › Moved the event history from PostgreSQL to       │   Java              ●●●○○ │
├──────────────────────────────────────────────────────┴───────────────────────────┤
│ Left  ■■■■■■■■□□ 84 % full     Right ■■■■■■■■■■ 98 % full                        │
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

<details>
<summary><b>What the marks mean</b></summary>

| Mark | Meaning |
| :--- | :--- |
| `╭───────┐` with `●   ●` | where your photo goes; the terminal shows Oriko, the oriko logo, the classic file shows the photo |
| `UPPER CASE` | a section heading, such as Professional Experience |
| `●` and `│` | a job: its marker and its timeline; the dates stand right of the title |
| `›` | a bullet point of a job |
| `●●●●○` | a skill level, from 0 to 5 dots |
| `■■■□□` | how full the column is; at 100 % the next block moves to the next page |

</details>

When your CV needs more pages than allowed, the preview names the blocks that do not fit and says
what to change:

```text
Refused (fix) at place: the input has 2 issue(s).
Next: fix every listed issue and call again.
Nothing was written.
- PAGE_OVERFLOW at pages: "These blocks of the left column land after page 1: campus". Hide or shorten blocks of the left column, remove a page pin, or raise "pages".
```

The first line says that oriko refused, that the input can be fixed (`fix`), and at which step
(`place`, the page planning). Each line that starts with `-` names one problem and what to change.

When another program reads the output instead of a terminal, `preview` answers JSON with the
sheets in its field `preview`. Add `--output text` to get the plain sheets there too.

## 📚 Examples

Three made-up people, three real job postings, one agent run each.

| 👩‍💻 Jane Doe · go-e Labs | 📋 Lukas Berger · DaVita | 🍳 Marco Weber · GALERIA |
| :---: | :---: | :---: |
| <img src="examples/showcase/go-e-senior-backend/page-1.png" width="200" alt="Jane Doe's CV for go-e Labs, page 1"> | <img src="examples/showcase/davita-it-project-manager/page-1.png" width="200" alt="Lukas Berger's CV for DaVita, page 1"> | <img src="examples/showcase/galeria-cook/terminal-page-1.png" width="200" alt="Marco Weber's CV for GALERIA in the terminal style, page 1"> |
| Senior Backend Engineer · 3 pages | IT Project Manager · 2 pages | Cook · 1 page |
| [posting](examples/showcase/go-e-senior-backend/posting.md) · [report](examples/showcase/go-e-senior-backend/report.md) · [preview](examples/showcase/go-e-senior-backend/preview.txt) | [posting](examples/showcase/davita-it-project-manager/posting.md) · [report](examples/showcase/davita-it-project-manager/report.md) · [preview](examples/showcase/davita-it-project-manager/preview.txt) | [posting](examples/showcase/galeria-cook/posting.md) · [report](examples/showcase/galeria-cook/report.md) · [preview](examples/showcase/galeria-cook/preview.txt) |
| classic: [Word](examples/showcase/go-e-senior-backend/go-e-senior-backend.docx) · [PDF](examples/showcase/go-e-senior-backend/go-e-senior-backend.pdf) | classic: [Word](examples/showcase/davita-it-project-manager/davita-it-project-manager.docx) · [PDF](examples/showcase/davita-it-project-manager/davita-it-project-manager.pdf) | classic: [Word](examples/showcase/galeria-cook/galeria-cook.docx) · [PDF](examples/showcase/galeria-cook/galeria-cook.pdf) |
| terminal: [Word](examples/showcase/go-e-senior-backend/go-e-senior-backend-terminal.docx) · [PDF](examples/showcase/go-e-senior-backend/go-e-senior-backend-terminal.pdf) | terminal: [Word](examples/showcase/davita-it-project-manager/davita-it-project-manager-terminal.docx) · [PDF](examples/showcase/davita-it-project-manager/davita-it-project-manager-terminal.pdf) | terminal: [Word](examples/showcase/galeria-cook/galeria-cook-terminal.docx) · [PDF](examples/showcase/galeria-cook/galeria-cook-terminal.pdf) |

<details>
<summary><b>👩‍💻 Jane Doe · Senior Backend Engineer at go-e Labs · all 3 pages</b></summary>

**Classic**

<p align="center">
  <img src="examples/showcase/go-e-senior-backend/page-1.png" width="32%" alt="Jane Doe's CV for go-e Labs, page 1 of 3">
  <img src="examples/showcase/go-e-senior-backend/page-2.png" width="32%" alt="Jane Doe's CV for go-e Labs, page 2 of 3">
  <img src="examples/showcase/go-e-senior-backend/page-3.png" width="32%" alt="Jane Doe's CV for go-e Labs, page 3 of 3">
</p>

**Terminal style**

<p align="center">
  <img src="examples/showcase/go-e-senior-backend/terminal-page-1.png" width="32%" alt="Jane Doe's CV for go-e Labs in the terminal style, page 1 of 3">
  <img src="examples/showcase/go-e-senior-backend/terminal-page-2.png" width="32%" alt="Jane Doe's CV for go-e Labs in the terminal style, page 2 of 3">
  <img src="examples/showcase/go-e-senior-backend/terminal-page-3.png" width="32%" alt="Jane Doe's CV for go-e Labs in the terminal style, page 3 of 3">
</p>

</details>

<details>
<summary><b>📋 Lukas Berger · IT Project Manager at DaVita · all 2 pages</b></summary>

**Classic**

<p align="center">
  <img src="examples/showcase/davita-it-project-manager/page-1.png" width="32%" alt="Lukas Berger's CV for DaVita, page 1 of 2">
  <img src="examples/showcase/davita-it-project-manager/page-2.png" width="32%" alt="Lukas Berger's CV for DaVita, page 2 of 2">
</p>

**Terminal style**

<p align="center">
  <img src="examples/showcase/davita-it-project-manager/terminal-page-1.png" width="32%" alt="Lukas Berger's CV for DaVita in the terminal style, page 1 of 2">
  <img src="examples/showcase/davita-it-project-manager/terminal-page-2.png" width="32%" alt="Lukas Berger's CV for DaVita in the terminal style, page 2 of 2">
</p>

</details>

<details>
<summary><b>🍳 Marco Weber · Cook at GALERIA · 1 page</b></summary>

**Classic**

<p align="center">
  <img src="examples/showcase/galeria-cook/page-1.png" width="32%" alt="Marco Weber's CV for GALERIA, page 1 of 1">
</p>

**Terminal style**

<p align="center">
  <img src="examples/showcase/galeria-cook/terminal-page-1.png" width="32%" alt="Marco Weber's CV for GALERIA in the terminal style, page 1 of 1">
</p>

</details>

> [!NOTE]
> The people are invented. The postings are real, summarized in our own words with a link to the
> source, and may be gone by now. The portraits are drawn avatars from
> [DiceBear](https://www.dicebear.com/styles/lorelei/) (Lorelei, CC0 1.0).

## 🗂️ Your data

Your CVs live outside the repository, in `~/.oriko`; `--home <folder>` points oriko at another one.

```text
~/.oriko/
  cvs/jane-doe.json        your CV: language, person, contact, pages, blocks
  cvs/jane-doe.png         its photo
  profiles/acme.json       one version per job posting, naming its CV in "cv"
```

> [!TIP]
> Try oriko without your own data: [`examples/`](examples/) holds a complete data folder. Add
> `--home examples` to any command.

## ✍️ First steps by hand

The agent runs these commands for you. By hand, they look like this.

Create a CV and fill it:

```sh
oriko init --cv jane-doe --json '{"language":"en","firstName":"Jane","lastName":"Doe","role":"Backend Engineer"}'
oriko contact add --json '{"value":{"icon":"mail","lines":["jane.doe@example.com"]}}'
oriko block add --json '{"block":{"id":"northwind","kind":"job","section":"Professional Experience","from":"03/2021","to":"today","title":"Backend Engineer","place":"Berlin (DE)","employer":"Northwind GmbH","bullets":["Rebuilt the tracking service"]}}'
oriko block add --json '{"block":{"id":"tools","kind":"list","section":"Skills","title":"Tools","items":["Go","Kafka","Terraform"]}}'
oriko photo set ~/Pictures/portrait.jpg
```

Write a version for one job posting in `~/.oriko/profiles/acme.json`:

```json
{ "cv": "jane-doe", "blocks": { "tools": { "items": ["Go", "Kafka"] } } }
```

Check, look, build:

```sh
oriko plan --profile acme
oriko preview --profile acme
oriko build --profile acme --out acme.docx
```

Upload `acme.docx` to Google Docs and save it there with File, Download, PDF.

> [!WARNING]
> The layout is tuned to how Google Docs sets the file, with Open Sans and Calibri. Word or
> LibreOffice set the same file with other line breaks, and a block that fits in Google Docs may
> spill over elsewhere.

## 📌 Good to know

**💡 Tips**

- You can write to the agent in any language. Your CV keeps its own language.
- A page looks too empty? A block is pinned: `"page": 2` makes it start on page 2, however much
  room is left before it. A version removes the pin with `"page": null`.

**ℹ️ Your data**

- Your CVs never go into the repository. They stay in `~/.oriko` on your computer. An AI
  assistant you work with reads the parts of them it needs, as with any file you show it.

**⚠️ Before you send**

- An agent can misread or reword a fact. Read the preview and the PDF line by line: names,
  employers, places, dates and levels.
- The preview shows what stands on which page and how full each column is. It does not show
  fonts, exact distances or the photo.
- Send the terminal style by mail to people, not through an upload portal. A portal reads the
  text, and the two columns run together line by line.

**❗ What the agent never does**

- It never adds a skill, a level, a date or a fact you did not state. It never changes your CV for
  a single job, and never overwrites a version you already have. When it needs any of that, it
  stops and asks you.

<details>
<summary><b>❓ Why a CLI and not an MCP server?</b></summary>

- A CLI works with every agent that can run a command, such as Claude Code, Codex or Gemini CLI,
  and with people at a terminal. An MCP server needs a running process and an entry in the
  settings of each client.
- The agent asks `oriko schema` only for the command it needs. Most MCP clients put the
  description of every tool into the agent's context up front, whether it is used or not.
- oriko reads and writes plain files on your computer, so you can check, script and test every
  step yourself.
- An MCP server could wrap the CLI later without changing it. Poehnelt's article calls this
  serving several surfaces from one tool.

</details>

## 🛠️ Development

```sh
pnpm test             # api and internals tests
pnpm run typecheck
pnpm run format:check
```

## ⚖️ License

GNU Affero General Public License v3.0, see [LICENSE](LICENSE).
