# cli/

The shell around oriko: it takes one call, sends it to the right feature, and gives one answer.

A call is a command with its options, such as `oriko build --profile acme --out cv.pdf`. This
folder reads the call in full, checks that the command and its options exist, routes it to the
feature that does the work, and writes the answer: one line of JSON for a program or an agent,
indented JSON or plain lines for a person. A success names the steps that can follow, when there
are any, and every refusal says what to fix.

It is the only folder that combines several features. A build, for example, uses the page plan
from `core/`, the classic or terminal style (`--style`) from `classic/` or `terminal/`, and `pdf/`
for the PDF.

## Modules

- `run.ts`: runs one call from start to end and ends with its exit code.
- `args.ts`: reads every argument of a call, so one answer can name all its mistakes at once.
- `commands.ts`: the one table of all commands, with what each does, its options and its input.
- `route.ts`: picks the command a call names and refuses an option or word it does not take.
- `dispatch.ts`: hands a checked call to the feature that does the work.
- `input.ts`: reads the JSON input of a command from `--json` or from stdin.
- `values.ts`: lists the values an option accepts when it is given without one, such as `--cv`.
- `build.ts`: runs `preview` and `build`, which need the page plan, a style and maybe the PDF.
- `out.ts`: checks the `--out` file of a build, so it is written inside the working directory.
- `describe.ts`: answers `oriko schema` with the commands, the options and the input shapes.
- `next.ts`: picks the next steps that follow a successful answer.
- `complete.ts`: adds the next steps to an answer, and the `--home` of the call to each command
  in it, so the command runs as it stands.
- `answer.ts`: writes the answer as JSON for a program or as text for a person.
- `types.ts`: the types the modules share: a call, its surroundings and the fields of an answer.
- `issues.ts`: the mistakes the shell itself refuses, such as an unknown option or command.

## Example

```sh
oriko block --output json
```

```json
{"ok":true,"command":"block","values":["block add","block update","block remove","block move"]}
```

A group without its action lists the actions; [the CLI page](../docs/cli.md) shows every kind of
answer.

## Connections

- **Uses:** [core/](../core/README.md) for the checks, the page plan, files and errors;
  [cv/](../cv/README.md) and [profile/](../profile/README.md) to create, list and show CVs and
  profiles; [edit/](../edit/README.md) to change a CV and for the input of its commands;
  [read/](../read/README.md) to read postings, notes and old CVs;
  [classic/](../classic/README.md) for the classic style and the photo;
  [terminal/](../terminal/README.md) for the preview and the terminal style;
  [pdf/](../pdf/README.md) for the PDF. `oriko schema` also lists the limits of read/ and pdf/.
- **Used by:** [bin/](../bin/README.md), which runs every call through it.

---

[← Back to the README](../README.md)
