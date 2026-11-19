# brand/

The look of oriko itself: the logo, the README header in a light and a dark version, and the
picture GitHub shows when someone shares the repository.

These files belong to the project's identity, not to the CVs it builds, and the open-source
license does not cover them: all rights stay with the author, as the License section of the
[README](../README.md) says.

## Contents

- `logo.svg`: the logo, a small pixel drawing of Oriko.
- `header.svg` and `header-dark.svg`: the header at the top of the README, for a light and a dark
  page.
- `icons/`: the icon before each heading of the README, a light and a dark version of each. The
  drawings are [Lucide](https://lucide.dev) icons under the ISC license in `icons/LICENSE`; only
  the mint tile around them is oriko's.
- `social-preview.png`: the picture GitHub shows for a shared link to the repository, once it is
  uploaded by hand in the repository settings.

## Connections

- **Used by:** the [README](../README.md) shows `header.svg` or `header-dark.svg` at its top, and
  an icon from `icons/` before each heading.
  Nothing in the repository uses `logo.svg` or `social-preview.png`, and no code reads these files.

---

[← Back to the README](../README.md)
