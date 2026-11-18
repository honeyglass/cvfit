# edit/

The commands that change a master CV, one small step at a time.

Instead of editing the JSON file by hand, a person or an agent adds, changes, removes or moves
one thing per call: a block such as a job, an item inside a block such as a bullet or a skill,
the person, or a contact line. Each change is checked before it is written, and the answer says
whether the CV still fits its pages.

Small, checked steps keep the master valid at all times, so a mistake is caught where it happens.

## Modules

- `save.ts`: applies one edit to a stored CV, writes it back, and says whether the CV still fits
  its pages.
- `apply.ts`: makes one change to a CV, such as to a block, an item, the person or a contact line,
  and refuses a change that would break the CV.
- `edit.schema.ts`: describes the input each edit command takes.
- `issues.ts`: the refusals for an unknown command, a move without a place or with a wrong anchor,
  and an index past the end of a list.

## Example

```sh
oriko block move --cv jane-doe --json '{"id":"awards","page":2}'
oriko item add --cv jane-doe --json '{"block":"tools","value":"Docker"}'
oriko contact remove --cv jane-doe --json '{"index":0}' --dry-run
oriko cv update --cv jane-doe --json '{"person":{"role":"Staff Engineer"}}'
```

`oriko schema block move` shows the input of one command; [the CLI page](../docs/cli.md#commands)
lists them all.

## Connections

- **Uses:** [core/](../core/README.md) for the CV schema, the check, the page plan, the data
  folder and safe file writes.
- **Used by:** [cli/](../cli/README.md), which runs every edit command and builds its command
  table from the inputs.

---

[← Back to the README](../README.md)
