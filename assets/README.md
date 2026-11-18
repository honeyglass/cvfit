# assets/

The pictures and fonts that go into every CV oriko builds.

The small icons mark the contact lines and the jobs, and the placeholder stands in for the photo
until you set your own. The fonts in `fonts/` are the exact versions Google Docs uses; LibreOffice
gets them for a PDF, so both set lines and pages the same way. Where each font comes from and how
it was cut: [fonts/README.md](fonts/README.md).

## Contents

- `pin.png`, `home.png`, `phone.png`, `mail.png`, `globe.png`: the icons in front of the contact
  lines of the classic CV.
- `job-pin.png`: the mark in front of each job in the classic CV.
- `placeholder.png`: the photo a new CV gets from `oriko init` until you set your own.
- `fonts/`: the font files LibreOffice gets for a PDF, each with its license.

## Example

```json
{ "icon": "phone", "lines": ["+49 (0) 30 000 000"] }
```

This contact line from `examples/cvs/jane-doe.json` gets `phone.png` in front of the number.

## Connections

- **Used by:** [classic/](../classic/README.md) puts the icons into the Word file,
  [cv/](../cv/README.md) copies the placeholder for a new CV, and [pdf/](../pdf/README.md) hands
  `fonts/` to LibreOffice.

---

[← Back to the README](../README.md)
