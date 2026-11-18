# cli/

The shell around oriko: it takes one call, sends it to the right feature, and gives one answer.

A call is a command with its options, such as `oriko build --profile acme --out cv.pdf`. This
folder reads the call in full, checks that the command and its options exist, routes it to the
feature that does the work, and writes the answer: JSON for a program or an agent, readable text
for a person. Every answer names the next steps, and every refusal says what to fix.

It is the only folder that combines several features. A build, for example, uses the page plan
from `core/`, a look from `classic/` or `terminal/`, and `pdf/` for the PDF.

## Parts

- **Reading the call:** the arguments, the command table, the JSON input.
- **Routing:** which command runs, and which options it refuses.
- **Answering:** the answer as JSON or text, the next steps, the issues of the shell.
- **Composed commands:** preview, build and `oriko schema`, which need more than one feature.

---

[← Back to the README](../README.md)
