---
name: oriko
description: Keeps the user's CVs with the oriko CLI and tailors them to job postings (a profile that hides, reorders and shortens blocks of a master CV, checked to fit the pages, built as a .docx for Google Docs); use it whenever the user wants a version of their CV for a specific job or company, wants to create a new CV or add jobs, skills or contact details to one, in any wording or language, or asks to preview, check or build an oriko profile, even when oriko is not named.
---

# oriko: CVs and a version per job posting

Keep each CV as one master, tailor it to a posting with a profile, prove with oriko that it fits, then build the .docx.

- oriko keeps one or more master CVs and one small profile per job posting.
- A profile says only what differs for that posting: hidden blocks, an order, shorter or reworded bullets.
- oriko places every block whole on the pages, so a job never breaks across a page.
- The user uploads the .docx to Google Docs and saves it as PDF there.

The CV is the user's word about their own career, sent to real employers.
Everything in the CV must stay true.

## Running oriko

Use the command `oriko`; without it, run the repository's entry point with Node 24 or newer.

- `command -v oriko` tells whether the command exists.
- The repository is the folder three levels above this skill's base directory, with links resolved.
- Every command answers one JSON object on stdout.

```bash
ORIKO_REPO="$(cd -P "<base directory of this skill>/../../.." && pwd)"
node "$ORIKO_REPO/bin/oriko.ts" profiles
```

| Answer                      | Exit code | What to do                                                     |
| :-------------------------- | :-------- | :------------------------------------------------------------- |
| '"ok": true'                | 0         | go on                                                          |
| '"ok": false' with 'issues' | 1         | follow the 'hint' of each issue, then call again               |
| '"kind": "bug"'             | 2         | stop and tell the user; oriko has a bug, do not work around it |

`oriko schema` lists all commands and options.
`oriko schema <name>` gives the accepted input of one, such as `oriko schema profile`.

## The data folder

The data folder is `~/.oriko`; when the user names another one, pass `--home <folder>` to every command.

| Path                 | Content                                                                              |
| :------------------- | :----------------------------------------------------------------------------------- |
| 'cvs/NAME.json'      | one master CV: 'language', person, contact, 'pages' (the most pages allowed), blocks |
| 'cvs/NAME.png'       | the photo of that master, shared by its profiles                                     |
| 'profiles/NAME.json' | one profile per job posting; its field 'cv' names its master                         |
| 'profiles/NAME.png'  | the photo of one profile, set with 'oriko photo set --profile NAME'                  |

A command finds its master through the profile, or through `--cv NAME`.
Without either, oriko takes the only master; with several, it answers `CV_REQUIRED` and lists them.

A block has an `id`, a `kind` and a `section`.
Blocks of kind `job` fill the left column.
Blocks of kind `rated` (skills with a level from 0 to 5), `list` and `entries` fill the right column.
A block with `page` starts on that page at the earliest.

## Rules for every state

**Nothing in a CV is invented, and a master changes only when the user asks for it.**

- Nothing invented: a master holds only what the user said; a profile hides, reorders, shortens and rewords it.
  Never add a skill, tool, project, responsibility or number the user did not state.
  Never raise a level, never change a date, employer, job title or place.
- Masters: change one with `init`, `block`, `item`, `cv update` and `contact` only in the flow 7 to 10.
  Tailoring to a posting writes a profile and leaves the master as it is.
- Time order: jobs in the left column stay newest first, because recruiters read them so.
  Hide an old or unrelated job instead of moving the job.
- Existing profiles: overwrite `profiles/NAME.json` only when the user asked to revise that profile.
- Privacy: never paste a master or a profile into a web service. Reading the posting from a URL is fine.

## Flow

**Move only along the rows of this table; a move missing from the table is a mistake to report.**

**STOP** means: halt, say what happened, ask the user, and continue only along the answer.

| From         | To           | When                                                            |
| :----------- | :----------- | :-------------------------------------------------------------- |
| 0 Setup      | 1 Posting    | 'oriko cvs' answers ok and the user gave a posting     |
| 0 Setup      | 7 Facts      | the user gives career facts or asks for a new CV |
| 0 Setup      | 11 Interview | the user gave a posting and no master is found |
| 0 Setup      | STOP         | neither oriko nor Node 24 runs |
| 1 Posting    | 2 Inspect    | the posting text is at hand                                     |
| 1 Posting    | STOP         | no posting, the URL cannot be read, or the master unclear       |
| 2 Inspect    | 3 Draft      | every block that may change has been read                       |
| 3 Draft      | 4 Check      | the profile file is written                                     |
| 3 Draft      | STOP         | the profile exists, a new claim is needed, or more pages        |
| 4 Check      | 3 Draft      | 'oriko plan' refuses the profile (**back edge**, bound 3)       |
| 4 Check      | STOP         | 'oriko plan' refused the profile a third time                   |
| 4 Check      | 5 Build      | 'oriko plan' answers ok                                         |
| 5 Build      | 6 Report     | the .docx is written                                            |
| 6 Report     | 3 Draft      | the user asks for changes (**back edge**)                       |
| 6 Report     | done         | the report is given                                             |
| 7 Facts      | 8 Write      | every job has dates, employer, job title and place              |
| 7 Facts      | STOP         | a job lacks one of them, or the target master is unclear        |
| 8 Write      | 9 Verify     | every fact is written with an oriko command                     |
| 9 Verify     | 8 Write      | 'oriko plan' refuses the master (**back edge**, bound 3)        |
| 9 Verify     | STOP         | 'oriko plan' refused the master a third time                    |
| 9 Verify     | 10 Hand over | 'oriko plan' answers ok                                         |
| 10 Hand over | 1 Posting    | the report is given and a posting waits from the start |
| 10 Hand over | done         | the report is given and no posting waits |
| 11 Interview | 7 Facts      | the user answered the questions |
| 11 Interview | 0 Setup      | the user names a folder that holds a CV (**back edge**) |
| 11 Interview | STOP         | the user does not want a new CV |

### 0 Setup

Find how to run oriko, then run `oriko cvs` and `oriko profiles`.

- `oriko cvs` lists every master with its name, language and person, and whether it fits its pages.
- `oriko profiles` lists the existing profiles, their master, and whether each one builds.
- The issue `NO_CV` means no master: for a posting, go on to 11 Interview; for a new CV, to 7 Facts.

### 1 Posting

Take the posting from the conversation, a file or a URL, and note what it asks for.

- Note the role and its level, the must-have skills, the nice-to-have skills and the domain.
- Choose the master in the posting's language; with none, the only master, or the one the user names.
- The master is unclear when several fit equally: STOP and ask which one.

### 2 Inspect

Run `oriko show --cv NAME` for the outline, then `oriko show --cv NAME --block <id>` for every block you may change.

- The outline lists each block's id, kind, column, section, title and number of items.
- Read the master only through `show`, so the rest of the CV stays out of the context.

### 3 Draft

Write `profiles/NAME.json` in the data folder: its field `cv` names the master, the rest only what differs.

- Read `./references/profile.md` for the format before the first draft.
- Put first what the posting asks for: order the right-column groups by match.
- Hide what does not help this application, starting with the oldest and least related blocks.
- Reword a bullet to the posting's keyword only where the master supports the keyword.
  **A verb, duty or tool that only the posting names is a new claim: STOP and ask.**
  Example: the master says 'Kunden beraten'; 'Kunden beraten und Verträge abschließen' adds a duty.
- Name the profile in lower-case words with hyphens, such as `acme-senior-frontend`.

Coming back from 4 Check, change only what the refusal names:

| Issue code                | Change                                                                                            |
| :------------------------ | :------------------------------------------------------------------------------------------------ |
| 'PAGE_OVERFLOW'           | first clear a 'page' pin of a named block in the profile; then hide or shorten the least relevant |
| 'BLOCK_TOO_TALL'          | shorten the named block                                                                           |
| 'ROLE_TOO_LONG'           | shorten 'person.role' in the profile, keeping only words the master or the posting's title uses   |
| 'SCHEMA', 'UNKNOWN_BLOCK' | fix the named path                                                                                |

Raising `pages` in the master is the user's decision: STOP and ask.

### 4 Check

Run `oriko plan --profile NAME`.

- An answer `ok` lists per page and column the blocks and the free space in pt.
- A refusal goes back to 3 Draft with its issues.
- A gap at the end of a page comes from a block that did not fit whole, or from a `page` pin.
  A pin cleared in the profile with `"page": null` changes this version only, so clear it when a relevant block would move up.

### 5 Build

Run `oriko build --profile NAME --out NAME.docx` in the user's working directory.

- `--out` must be a `.docx` path inside the current folder.
- Add `--dry-run` only when the user asked for a dry run.
- Add `--style terminal` when the user asks for the version in the look of the preview; name it
  `NAME-terminal.docx`. Tell the user to send it by mail to people, not through an upload portal:
  portals read the text, and the two columns run together line by line.

### 6 Report

Show the preview, then say what changed and why.

- Run `oriko preview --profile NAME --output text` and print the output unchanged in a code block.
- Name the profile file and the `.docx` written.
- List what you hid, reordered, shortened and reworded, each with its reason from the posting.
- List what the posting asks for and the CV does not show, so the user can add it to the master.
- Name the next manual step: upload the `.docx` to Google Docs, then File, Download, PDF.
- **Close by asking the user to read the preview and the PDF line by line before sending it.**
  An agent can misread or reword a fact; only the user knows the facts.

### 7 Facts

Read the user's text and sort what it states into jobs, skills, languages and contact lines.

- A job needs dates, employer, job title and place; ask for whatever the text leaves out.
- Target: a new master when the user asks for a new CV, else the master the user names or the only one.
- A new master takes the language of the user's text; its name is the person's name in lower case with hyphens.

### 8 Write

Write every fact with an oriko command; read `./references/master.md` for the commands and their input.

- A new master starts with `oriko init`; section titles and the contact title follow its language.
- Jobs go in newest first, each bullet in the user's words, shortened at most.
- Employer, job title and place go in as the user named them; ask when the words leave it open.
  Example: 'bei Siemens, im Werk in Erlangen' gives the employer 'Siemens' and the place 'Erlangen'.
- A skill gets a level only from a word the user used, by the table in `./references/master.md`.
  A skill named without such a word goes into a `list` block, without a level.

### 9 Verify

Run `oriko plan --cv NAME`.

- An answer `ok` means the master is valid and fits its pages.
- A refusal goes back to 8 Write with its issues; raising `pages` is the user's decision: STOP and ask.

### 10 Hand over

Show the preview, then say what you wrote.

- Run `oriko preview --cv NAME --output text` and print the output unchanged in a code block.
- List every level you derived from the user's words, with the word, so the user can correct it.
- List what a CV usually holds and the text did not give: education, phone, photo (`oriko photo set`).
- Build a `.docx` only when the user asks for one: `oriko build --cv NAME --out NAME.docx`.
- **Ask the user to read the preview line by line; an agent can misread or reword a fact.**
- A posting from the start still waits: go on to 1 Posting with the new master.

### 11 Interview

The user gave a posting but has no CV yet: offer to create one, and ask for the facts in short rounds.

- First ask whether an oriko CV lies in another folder; a named folder goes back to 0 Setup with `--home`.
- Then ask in three rounds, one message each, and wait for each answer:
  1. name, the job title the user holds, city, e-mail and phone
  2. every job, newest first: from and to, job title, employer, place, and what the user did there
  3. skills with how well the user knows each one, and languages with their level
- Ask in the language the user writes in, and say why: the CV holds only what the user says.
- Take every answer as the user's own words; a question the user skips stays out of the CV.
- Keep the posting for 1 Posting, which follows after 10 Hand over.
