# bin/

The front door: the program you start when you type `oriko`.

It connects the command line to the real world: the terminal, the data folder in your home
directory, the network and the place where LibreOffice is installed. Everything else happens in
the other folders; this one only hands the call over to `cli/` and keeps its exit code.

The installer links `~/.local/bin/oriko` to `bin/oriko.ts`, so this file never moves.

## Modules

- `oriko.ts`: starts oriko with the real terminal, the data folder `~/.oriko`, the network and the
  places where LibreOffice may be installed.

## Example

```sh
node bin/oriko.ts schema   # from a clone of the repository
oriko schema               # after the install, through the link the installer makes
```

The second line runs `bin/oriko.ts` of the copy the installer keeps in `~/.local/share/oriko`.

## Connections

- **Uses:** [cli/](../cli/README.md) to run the call, [core/](../core/README.md) to read piped
  input up to its size limit, [read/](../read/README.md) for the real network, and
  [pdf/](../pdf/README.md) for the places where LibreOffice may be installed.
- **Used by:** no folder imports it; [install.sh](../install.sh) links `~/.local/bin/oriko` to it,
  and the `bin` field of [package.json](../package.json) names it.

---

[← Back to the README](../README.md)
