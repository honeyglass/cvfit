# oriko

**One CV, tailored to every job posting, laid out so no job ever breaks across a page.**

oriko keeps your CV as a JSON file and builds it as a two-column `.docx` that Google Docs opens
and saves as PDF. For each job posting you write a small profile that hides, reorders or shortens
parts of the CV. oriko places every block whole on the pages: a job with its bullets, or a skill
group with its title, moves to the next page as one piece when it no longer fits.

Before you build, the terminal shows each page as a sheet ([more on the preview](#terminal-preview)):

```text
╭─ Page 1 of 2 ────────────────────────────────────────┬───────────────────────────╮
│    ╭───────╮                                    Jane │ CONTACT                   │
│    │  ◠ ◠  │                                     Doe │ Germany, Berlin           │
│    │   ‿   │                 Senior Backend Engineer │ Example Street 1          │
│    ╰───────╯                                         │ 10115 Berlin              │
│                                                      │ jane.doe@example.com      │
│ PROFESSIONAL EXPERIENCE                              │                           │
│                                                      │ SKILLS                    │
│ 03/2021 – today   ● Senior Backend Engineer          │ Tools                     │
│                   │ Northwind Logistics GmbH ·       │ PostgreSQL, Kafka,        │
│                   │   Berlin (DE)                    │ Kubernetes, Terraform     │
│                   │ ✓ Rebuilt the shipment           │                           │
│                   │   tracking service               │ Programming Languages     │
│                   │ ✓ Role: Engineer, Architect      │ Go                  ●●●●● │
├──────────────────────────────────────────────────────┴───────────────────────────┤
│ Left  ▰▰▰▰▰▰▱▱▱▱ 56 % full     Right ▰▰▰▰▰▰▰▱▱▱ 74 % full                        │
╰──────────────────────────────────────────────────────────────────────────────────╯
```

## Installation

oriko needs Node 24 or newer, which runs its TypeScript directly, and pnpm.

```sh
git clone git@github.com:honeyglass/oriko.git
cd oriko
pnpm install --frozen-lockfile
node bin/oriko.ts schema
```

The examples below write `oriko` for `node bin/oriko.ts`.

## Your data

Your CVs live outside the repository, in `~/.oriko`; `--home <folder>` points oriko at another one.

```text
~/.oriko/
  cvs/jane-doe.json        a master CV: language, person, contact, pages, blocks
  cvs/jane-doe.png         its photo
  profiles/acme.json       one profile per job posting, naming its master in "cv"
```

[`examples/`](examples/) holds a complete data folder to try it: pass `--home examples`.

## First steps

Create a CV and fill it:

```sh
oriko init --cv jane-doe --json '{"language":"en","firstName":"Jane","lastName":"Doe","role":"Backend Engineer"}'
oriko contact add --json '{"value":{"icon":"mail","lines":["jane.doe@example.com"]}}'
oriko block add --json '{"block":{"id":"northwind","kind":"job","section":"Professional Experience","from":"03/2021","to":"today","title":"Backend Engineer","place":"Berlin (DE)","employer":"Northwind GmbH","bullets":["Rebuilt the tracking service"]}}'
oriko block add --json '{"block":{"id":"tools","kind":"list","section":"Skills","title":"Tools","items":["Go","Kafka","Terraform"]}}'
oriko photo set ~/Pictures/portrait.jpg
```

Tailor it to a posting with a profile in `~/.oriko/profiles/acme.json`:

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

## Terminal preview

`oriko preview` draws the pages as oriko will lay them out, so you can compare profiles before you
build one. It needs no Google Docs, no fonts and no network.

```sh
oriko preview --profile acme      # a profile, with its master
oriko preview --cv jane-doe       # a master as it stands
```

In a terminal it prints the sheets. In a pipe it answers JSON with the same text in the field
`preview`; `--output text` prints the sheets there too.

### What a sheet shows

Each page is one frame of 84 characters, the left column beside the right one, as in the
document. The second page of the example profile `acme`:

```text
╭─ Page 2 of 2 ────────────────────────────────────────┬───────────────────────────╮
│ PROFESSIONAL EXPERIENCE                              │ LANGUAGES                 │
│                                                      │ German              ●●●●● │
│ 10/2014 – 05/2017 ● Working Student                  │ English             ●●●●○ │
│                   │ Campus Software Lab · Berlin     │                           │
│                   │   (DE)                           │ AWARDS                    │
│                   │ ✓ Maintained the booking         │ Certified Kubernetes      │
│                   │   system of the university       │ Administrator             │
│                   │   library                        │ 09/2022                   │
│                   │ ✓ Role: Engineer                 │                           │
├──────────────────────────────────────────────────────┴───────────────────────────┤
│ Left  ▰▰▰▱▱▱▱▱▱▱ 26 % full     Right ▰▰▱▱▱▱▱▱▱▱ 23 % full                        │
╰──────────────────────────────────────────────────────────────────────────────────╯
```

| Mark | Meaning |
| :--- | :--- |
| `╭───────╮` with `◠ ◠` | where the photo stands; the terminal shows a face, never the picture |
| `UPPER CASE` | a section heading, printed once per page above its first block |
| `●` and `│` | a job's date, its marker and its timeline, with the employer and place below |
| `✓` | a bullet of a job |
| `●●●●○` | a rated skill, one filled dot per level from 0 to 5 |
| `▰▰▰▱▱` | how full the column is; at 100 % the next block moves to the next page |

The fill bars tell you where room is left. A short page, as page 2 above, often comes from a
block pinned to a page in the master (`"page": 2`); a profile clears the pin with `"page": null`.

### When the CV does not fit

When the blocks need more pages than the master allows, `preview` draws nothing and names the
blocks that land too late, with what to change:

```text
Refused (fix) at place: the input has 2 issue(s).
Next: fix every listed issue and call again.
Nothing was written.
- PAGE_OVERFLOW at pages: "These blocks of the left column land after page 1: campus". Hide or shorten blocks of the left column, remove a page pin, or raise "pages".
```

> [!WARNING]
> The preview shows what stands on which page, in which order, and how full each column is. It
> does not show fonts, exact distances or the photo, and its line breaks are the terminal's, not
> the document's. The page plan behind it is the one `build` uses.

## Commands

Every command answers one JSON object on stdout, exit 0 for success and 1 for a refusal with its
issues and a hint each. `oriko schema` lists every command and option, `oriko schema <command>`
the input one accepts.

| Command | What it does |
| :--- | :--- |
| `cvs`, `profiles` | list the CVs and the profiles, and whether each one fits its pages |
| `show` | outline of a CV; `--block <id>` shows one block in full |
| `plan`, `preview` | the page plan as JSON, or as the sheets above |
| `build --out <file>.docx` | writes the `.docx`; `--dry-run` writes nothing |
| `init`, `cv update` | create a CV, change its language, pages, person or contact title |
| `block …`, `item …`, `contact …` | add, update, remove and move blocks, their items and contact lines |
| `photo set <file>` | stores a PNG or JPEG as the square photo of a CV, or of one profile |

## With an agent

[`.claude/skills/oriko/`](.claude/skills/oriko/SKILL.md) is a skill for Claude Code. In a session
in this repository, give it a job posting and it writes the profile, checks that it fits and
builds the `.docx`; give it a text about your career and it creates or extends a CV. It never adds
a skill, level or fact you did not state.

## Development

```sh
pnpm test             # api and internals tests
pnpm run typecheck
pnpm run format:check
```

## License

GNU Affero General Public License v3.0, see [LICENSE](LICENSE).
