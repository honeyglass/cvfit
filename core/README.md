# core/

What every feature shares: the shape of a CV, the rules it must follow, and how pages are planned.

A CV enters oriko as a JSON file. Before anything uses it, `core/` checks it against one schema
and refuses it with a list of every problem. It then plans the pages: which block stands on which
page, each block whole, with heights estimated from the text. Both looks build on that plan, so
the preview and the files always agree.

It also holds what several features need alike: reading and writing files safely, finding the
data folder, the options of the commands, and the one shape of an error. `core/` imports nothing
from the other folders, so every feature can rely on it.

## Parts

- **The CV:** its schema, its limits, and the check every input goes through.
- **The page plan:** the measurements of the page and the placing of blocks on it.
- **Shared ground:** files, the data folder, loading a CV and its profile, the options.
- **Errors:** the one error shape, and the issues several folders raise.

---

[← Back to the README](../README.md)
