# Fonts for the PDF

`oriko build --out <name>.pdf` hands these fonts to LibreOffice, so the PDF uses the same font
files as Google Docs. Google Docs takes its fonts from Google Fonts; another version of the same
font has other widths and line heights, and the lines and pages then break elsewhere.

| File | Source in google/fonts | Change |
| :--- | :--- | :--- |
| `FiraCode-Regular.ttf` | `ofl/firacode/FiraCode[wght].ttf` | the instance `wght=400` |
| `OpenSans-Regular.ttf` | `ofl/opensans/OpenSans[wdth,wght].ttf` | the instance `wght=400 wdth=100` |
| `OpenSans-Light.ttf` | `ofl/opensans/OpenSans[wdth,wght].ttf` | the instance `wght=300 wdth=100` |
| `OpenSans-Bold.ttf` | `ofl/opensans/OpenSans[wdth,wght].ttf` | the instance `wght=700 wdth=100` |
| `OpenSans-Italic.ttf` | `ofl/opensans/OpenSans-Italic[wdth,wght].ttf` | the instance `wght=400 wdth=100` |
| `QuattrocentoSans-Regular.ttf` | `ofl/quattrocentosans/QuattrocentoSans-Regular.ttf` | none |
| `OrikoHeading-Regular.ttf` | Carlito, not from google/fonts; see below | baseline, name |

The Google Fonts files come from google/fonts at commit `cc39c4c2c304bc368c9b7c311ea2bcc6013299fe`.
LibreOffice picks the wrong instance of a variable font, such as Fira Code Retina for Fira Code,
so each style used is a static file of its own, made with fontTools:

```sh
fonttools varLib.instancer 'OpenSans[wdth,wght].ttf' wght=400 wdth=100 \
  --update-name-table --no-recalc-timestamp -o OpenSans-Regular.ttf
```

Quattrocento Sans stands in for "Segoe UI Symbol", the font of the bullet mark, as it does in
Google Docs.

Calibri is not free. `OrikoHeading-Regular.ttf` stands in for it: Carlito, which has the widths
of Calibri, from `crosextrafonts-carlito-20130920.tar.gz`, the package LibreOffice ships. Google
Docs places the baseline of Calibri by its Windows ascent, LibreOffice by the hhea ascent, which
is 0.2 em smaller in Carlito; so hhea and typo get the Windows values. The line stays as high, and
only the letters of the name and the headings look a little different from Calibri. Carlito has
the Reserved Font Name "Carlito", so the changed font carries another name, as the license asks:

```python
os2, hhea = font['OS/2'], font['hhea']
hhea.ascent, hhea.descent, hhea.lineGap = os2.usWinAscent, -os2.usWinDescent, 0
os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = os2.usWinAscent, -os2.usWinDescent, 0
# name IDs 1, 3, 4 and 16: Carlito becomes Oriko Heading; ID 6: OrikoHeading
```

Each font is under the SIL Open Font License 1.1, in the `OFL-*.txt` file beside it.
