# 🔌 Compatibility

- **Google Docs**: the layout is tuned to how Google Docs sets the file, with Open Sans and
  Calibri. Open the Word file there and save it as PDF.
- ⚠️ **Word and LibreOffice** set the same file with other line breaks, so a block that fits in
  Google Docs may spill over to the next page.
- **PDF without Google Docs**: `oriko build --out <name>.pdf` writes the PDF through
  [LibreOffice](https://www.libreoffice.org/download), which has to be installed: on macOS
  `brew install --cask libreoffice`, on Debian or Ubuntu `sudo apt install libreoffice`, on
  Windows `winget install TheDocumentFoundation.LibreOffice`. Without it, oriko refuses and names
  these commands. For the PDF, oriko writes a .docx adjusted to how LibreOffice sets it and hands
  over the font files Google Docs uses ([assets/fonts](../assets/fonts/README.md)), so the PDF shows
  the page Google Docs shows: the same lines, page breaks and positions, within about 1 pt. Only
  Calibri differs: it is not free, so the name and the headings use a font with its widths and
  its baseline, whose letters look a little different. The terminal style matches exactly. macOS
  and Linux; Windows is not covered yet.
- **Terminal style**: set in Fira Code, which Google Docs offers, so every character keeps its
  column.
- **Terminal preview**: every line is 84 characters wide; a narrower terminal breaks the lines.
- **Node**: 24 or newer, which runs the TypeScript files of oriko as they are.
- **Install script**: macOS and Linux. Windows is not tested; use the manual installation there.
- **Agents**: the skill is written and tested for Claude Code. The quickstart adds it to every
  agent the skills CLI finds; any agent that can run a command can use the CLI through
  `oriko schema`.

---

[← Back to the README](../README.md)
