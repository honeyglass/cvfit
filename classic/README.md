# classic/

The classic look: the CV as a Word file in two columns, with your photo.

It turns the page plan from `core/` into a .docx. For a PDF it writes the file with the values
LibreOffice needs, so the PDF from Google Docs or from LibreOffice matches what oriko planned.
Jobs stand on the left, skills and languages on the right, and the photo sits round at the top.

The photo lives here too, since only this look shows it: `oriko photo set` takes any PNG or JPEG
and stores it as the square picture the CV uses.

## Modules

- `docx.ts`: writes the classic CV as a Word file, one table per page, for Google Docs or for
  LibreOffice.
- `photo.ts`: runs `oriko photo set`, which stores a picture as the photo of a CV or of one profile.
- `images.ts`: makes the pictures the file needs: the square photo, the round photo and the plain
  color bar.
- `issues.ts`: the errors this folder reports, such as a photo that is no PNG or JPEG.

## Example

```sh
oriko photo set portrait.jpg                                  # the photo of your CV
oriko build --profile go-e-senior-backend --out go-e.docx     # classic is the default look
```

The build reads the stored photo and makes it round in the file.

## Connections

- **Uses:** [core/](../core/README.md) for the CV, the page plan, the sizes and the data folder,
  and [assets/](../assets/README.md) for the contact icons.
- **Used by:** [cli/](../cli/README.md) for the commands `build` and `photo set`.

---

[← Back to the README](../README.md)
