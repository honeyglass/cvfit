# TODO

Open work on oriko, the CLI and its skill.
<!-- last item number: 15 -->

## Next

## README

- [ ] #15 Record a short video of a test run in the terminal, an agent building the terminal preview of a CV, and show it on the README page (added 2026-11-18)

## Structure

- [x] #13 Cut the folders by feature instead of by layer, as the Fable plan of 2026-11-18 proposes: core/ holds only what several features share (errors, CV schema and check, page plan, files, data folder), the looks become classic/, terminal/ and pdf/, the commands move to cv/, profile/, edit/ and read/, cli/run.ts splits into the shell's files, baselines/ moves to tools/baselines/; bin/oriko.ts stays, behavior stays, tests green after every commit (added 2026-11-18, done 2026-11-18)
      'cli/run.ts', 'install.sh'
- [x] #14 Collect the issues of each folder in its own issues.ts, the way each Go package has its errors.go: every issue a function in camelCase, a code as an UPPER_CASE constant only where another file compares it, and callers import the file as a namespace, so every call reads issue.tooManyRedirects(); the shared Issue shape and rejected() stay in core/errors.ts (added 2026-11-18, done 2026-11-18)

## CV score

- [ ] #1 Check the classic CV with Resume-Matcher after a build: run its ATS parse check on the PDF, add an export of a version to Resume-Matcher's resume format for its keyword score, and add a Score step to the skill that goes back to Draft at most three times, using only facts of the master CV (added 2026-11-16)
      'classic/docx.ts', '.claude/skills/oriko/SKILL.md'

## Roadmap

- [ ] #2 Add more CV templates besides the classic and the terminal style (added 2026-11-17)
- [ ] #3 Make the skill work in Codex (added 2026-11-17)
      '.claude/skills/oriko/SKILL.md'
- [ ] #4 Make the skill work in Gemini CLI (added 2026-11-17)
      '.claude/skills/oriko/SKILL.md'
- [ ] #5 Write a cover letter per job posting from the facts of the master CV (added 2026-11-17)
- [ ] #6 Add a one-line installer for Windows, like install.sh for macOS and Linux (added 2026-11-17)
      'install.sh'
- [ ] #7 Create a CV from a LinkedIn export or a JSON Resume file (added 2026-11-17)
- [x] #8 Add 'pnpm baselines:update' for the showcase examples, the references the tests compare against: a 'google.json' beside each Google PDF holds the sha256 of the .docx it came from; when the committed .docx changes, the command uploads it through the gws CLI, exports the PDF, renders the PNGs and writes the new hash, and a test fails while a hash does not match its .docx; no browser control, no '--engine' option for users (added 2026-11-17, done 2026-11-18)
      'package.json', 'examples/showcase', 'tests/api/pdf.api.spec.ts', 'tests/api/run.api.spec.ts'
- [ ] #9 Publish oriko on npm, where the name is still free (added 2026-11-17)
      'package.json'
- [ ] #10 Add an MCP server as a wrapper around the oriko CLI (added 2026-11-17)
- [ ] #11 Connect the LinkedIn API to read or write the LinkedIn profile (added 2026-11-17)
      'https://learn.microsoft.com/en-us/linkedin/dma/member-data-portability/member-data-portability-member/?view=li-dma-data-portability-2026-08'
- [ ] #12 Let others submit their own CV templates, independent of the classic and the terminal look (builds on #2): a template module that accepts a template in one fixed format, and a tool that analyzes a template a person already likes, deterministically and with an agent, and reports which of its parts oriko supports and which not; open question: what to do with a design part oriko cannot support (added 2026-11-18)
