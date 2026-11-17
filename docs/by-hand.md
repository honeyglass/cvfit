# ✍️ By hand

The agent runs these commands for you. By hand, they look like this. Start with `oriko` alone: it
shows where you stand, and every answer names the commands that can follow.

Create a CV and fill it:

```sh
oriko init --cv jane-doe --json '{"language":"en","firstName":"Jane","lastName":"Doe","role":"Backend Engineer"}'
oriko contact add --json '{"value":{"icon":"mail","lines":["jane.doe@example.com"]}}'
oriko block add --json '{"block":{"id":"northwind","kind":"job","section":"Professional Experience","from":"03/2021","to":"today","title":"Backend Engineer","place":"Berlin (DE)","employer":"Northwind GmbH","bullets":["Rebuilt the tracking service"]}}'
oriko block add --json '{"block":{"id":"tools","kind":"list","section":"Skills","title":"Tools","items":["Go","Kafka","Terraform"]}}'
oriko photo set ~/Pictures/portrait.jpg
```

Write a version for one job posting in `~/.oriko/profiles/backend-job.json`:

```json
{ "cv": "jane-doe", "blocks": { "tools": { "items": ["Go", "Kafka"] } } }
```

Check, look, build:

```sh
oriko plan --profile backend-job
oriko preview --profile backend-job
oriko build --profile backend-job --out backend-job.docx
```

Upload `backend-job.docx` to Google Docs and save it there with File, Download, PDF.

---

[← Back to the README](../README.md)
