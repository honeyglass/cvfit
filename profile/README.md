# profile/

The commands for the version of your CV for one job posting.

A profile does not copy your CV. It only says what differs for one posting, such as which blocks
to hide, in which order to show them, and which bullets to shorten or reword. In a list block,
such as the tools, a profile may only keep and reorder the master's items. This folder stores a
profile after checking it against its master CV, shows a stored profile with the posting it was
made for, and lists every profile with whether it fits its pages.

A new block in the master, and every field a profile leaves alone, reach every profile on their
own. A field the profile sets, such as a job's bullets, keeps the profile's version. A profile is
refused once it names a block or a list item the master no longer holds.

## Modules

- `set.ts`: checks a profile against its CV, stores it, and names each part it adds, changes or
  removes.
- `show.ts`: shows a stored profile and the job posting that `oriko read` stored for it.
- `list.ts`: lists the profiles with their CV and says whether each fits its pages.
- `name.ts`: checks a profile name before it becomes a file name.
- `issues.ts`: the refusals for a missing profile name, a profile that is already stored, and an
  unknown profile.

## Example

```sh
oriko profile set --profile acme --json '{"cv":"jane-doe","blocks":{"awards":{"hidden":true}}}'
oriko profile show --profile acme
oriko profiles
```

`oriko schema profile set` shows the input it takes.

## Connections

- **Uses:** [core/](../core/README.md) for the profile schema, the check, the page plan, the data
  folder and safe file writes.
- **Used by:** [cli/](../cli/README.md), which runs `profile set`, `profile show` and `profiles`.

---

[← Back to the README](../README.md)
