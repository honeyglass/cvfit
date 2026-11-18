# pdf/

Turns a Word file into a PDF, through LibreOffice on your own computer.

oriko writes .docx files. When you ask for a PDF, this folder hands the file to LibreOffice
with the fonts from `assets/fonts/`, so the PDF uses the same fonts as Google Docs and breaks
lines and pages in the same places. Without LibreOffice, the answer says how to install it, or
to save the .docx as PDF in Google Docs instead.

## Modules

- `convert.ts`: hands a Word file to LibreOffice and returns the PDF, and knows where each system
  installs LibreOffice.
- `issues.ts`: the errors this folder reports: LibreOffice is missing, or it wrote no PDF.
- `limits.ts`: how long one run of LibreOffice may take.

## Example

```sh
oriko build --profile go-e-senior-backend --out go-e.pdf
```

A file name that ends in `.pdf` sends the Word file through this folder.

## Connections

- **Uses:** [core/](../core/README.md) for answers and error codes, and the fonts in
  [assets/fonts/](../assets/fonts/README.md).
- **Used by:** [cli/](../cli/README.md) for `build` and `oriko schema`, and [bin/](../bin/README.md)
  for the places LibreOffice may be installed.

---

[← Back to the README](../README.md)
