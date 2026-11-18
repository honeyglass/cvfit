# bin/

The front door: the program you start when you type `oriko`.

It connects the command line to the real world: the terminal, the data folder in your home
directory and the place where LibreOffice is installed. Everything else happens in the other
folders; this one only hands the call over to `cli/` and passes its answer back.

The installer links `~/.local/bin/oriko` to `bin/oriko.ts`, so this file never moves.

---

[← Back to the README](../README.md)
