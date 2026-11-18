# tools/

Tools for the people who maintain oriko; they are not part of the program you install.

**baselines/** keeps the showcase examples in step with the code. The examples are references:
the tests compare every new build against them. When a look changes on purpose,
`pnpm baselines:update` fetches new PDFs from Google Docs and draws new page images, but only
for the examples whose files changed.

How to set it up once: [Baselines](../docs/baselines.md).

---

[← Back to the README](../README.md)
