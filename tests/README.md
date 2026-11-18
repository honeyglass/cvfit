# tests/

The checks that prove oriko still does what it promises, run with `pnpm test`.

- **api/** tests what a caller sees: the commands, their answers and the files they write. Most
  tests live here.
- **internals/** tests a part the commands cannot reach on their own, such as the height estimate.
- **e2e/** runs the installer in empty home folders, as a new user would.
- **fixtures/** and **utils/** hold the reference CV and the helpers the tests share.

Some tests compare new builds with the showcase files in `examples/`, so a change to a look shows
up here first.

---

[← Back to the README](../README.md)
