# ⌨️ CLI

## Agent DX rules

The rules start from Justin Poehnelt's article
[Rewrite your CLI for AI agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/).
The rules marked ➕ oriko are new: the author of oriko added them from building tools for agents.

| Rule | What oriko does | Why it helps the agent | Source |
| :--- | :--- | :--- | :--- |
| Raw JSON input | takes its whole input as one JSON object | passes the data as it is, without many flags | article |
| Schema at runtime | `oriko schema` shows every command and its input | looks the format up in the tool itself | article |
| JSON when piped | text for people, JSON for programs | each reader gets what it can read | article |
| Input hardening | the Word file and photos stay inside their folder | a mistake never writes elsewhere | article |
| Dry runs | `--dry-run` says what would happen | tries a command safely first | article |
| Agent skill | the agent's manual ships with the code | knows when to stop and ask you | article |
| Checks in layers | shape, then version, then pages; all errors at once | fixes real errors in one go | ➕ oriko |
| Errors with a hint | each error says where and what to change | fixes the input on its own | ➕ oriko |
| All or nothing | a refused command writes nothing | no file is left half changed | ➕ oriko |
| Exit codes 0, 1, 2 | 0 ok, 1 fix the input, 2 something broke | knows the next step from one number | ➕ oriko |
| Plan before the file | `plan` shows which block lands on which page | fixes an overflow before building | ➕ oriko |

## Commands

Every command answers one JSON object: on one line when another program reads it, indented in a
terminal, where `preview` shows its sheets and a refusal shows as readable lines. oriko ends with
exit code 0 when all went well, 1 when the input needs a fix (each issue with a hint), and 2 when
something broke. `oriko schema` lists every command and option, `oriko schema <command>` the input
one accepts.

| Command | What it does |
| :--- | :--- |
| `cvs`, `profiles` | list your CVs and versions, and whether each one fits its pages |
| `show` | outline of a CV; `--block <id>` shows one block in full |
| `plan`, `preview` | the page plan as JSON, or as the sheets of the terminal preview |
| `build --out <file>.docx` | writes the Word file; `--style terminal` in the look of the preview, `--dry-run` writes nothing |
| `init`, `cv update` | create a CV, change its language, pages, person or contact title |
| `block …`, `item …`, `contact …` | add, update, remove and move blocks, their items and contact lines |
| `photo set <file>` | stores a PNG or JPEG as the square photo of a CV, or of one version |

When another program reads the output instead of a terminal, `preview` answers JSON with the
sheets in its field `preview`. Add `--output text` to get the plain sheets there too.

## A refusal

A refusal the agent reads and acts on:

```json
{
  "ok": false,
  "kind": "fix",
  "issues": [
    {
      "code": "PAGE_OVERFLOW",
      "path": "pages",
      "message": "These blocks of the left column land after page 1: campus",
      "hint": "Hide or shorten blocks of the left column, remove a page pin, or raise \"pages\""
    }
  ]
}
```

`"ok": false` means oriko refused. `"kind": "fix"` says the agent can fix the input itself. Each
issue has a `code` the agent can check, a `path` to the wrong value, a `message` for people and a
`hint` on what to change.

In a terminal, the same refusal reads as lines. When your CV needs more pages than allowed, the
preview names the blocks that do not fit and says what to change:

```text
Refused (fix) at place: the input has 2 issue(s).
Next: fix every listed issue and call again.
Nothing was written.
- PAGE_OVERFLOW at pages: "These blocks of the left column land after page 1: campus". Hide or shorten blocks of the left column, remove a page pin, or raise "pages".
```

The first line says that oriko refused, that the input can be fixed (`fix`), and at which step
(`place`, the page planning). Each line that starts with `-` names one problem and what to change.

---

[← Back to the README](../README.md)
