# TODO

Open work on oriko, the CLI and its skill.
<!-- last item number: 11 -->

## Next

- #8

## CV score

- [ ] #1 Check the classic CV with Resume-Matcher after a build: run its ATS parse check on the PDF, add an export of a version to Resume-Matcher's resume format for its keyword score, and add a Score step to the skill that goes back to Draft at most three times, using only facts of the master CV (added 2026-11-16)
      'render/docx.ts', '.claude/skills/oriko/SKILL.md'

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
- [ ] #8 Get the PDF from Google Docs without uploading the .docx by hand: oriko uploads it and exports the PDF through the Google Workspace CLI or the Drive API, so no browser control is needed, also for the showcase PDFs the PDF test compares (added 2026-11-17)
- [ ] #9 Publish oriko on npm, where the name is still free (added 2026-11-17)
      'package.json'
- [ ] #10 Add an MCP server as a wrapper around the oriko CLI (added 2026-11-17)
- [ ] #11 Connect the LinkedIn API to read or write the LinkedIn profile (added 2026-11-17)
      'https://learn.microsoft.com/en-us/linkedin/dma/member-data-portability/member-data-portability-member/?view=li-dma-data-portability-2026-08'
