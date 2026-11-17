# 📌 Good to know

## 💡 Tips

- You can write to the agent in any language. Your CV keeps its own language.
- A page looks too empty? A block is pinned: `"page": 2` makes it start on page 2, however much
  room is left before it. A version removes the pin with `"page": null`.

## 🗂️ Your data

Your CVs never go into the repository. They stay in `~/.oriko` on your computer. An AI assistant
you work with reads the parts of them it needs, as with any file you show it.

## ⚠️ Before you send

- An agent can misread or reword a fact. Read the preview and the PDF line by line: names,
  employers, places, dates and levels.
- The preview shows what stands on which page and how full each column is. It does not show
  fonts, exact distances or the photo.
- Send the terminal style by mail to people, not through an upload portal. A portal reads the
  text, and the two columns run together line by line.

## ❗ What the agent never does

It never adds a skill, a level, a date or a fact you did not state. It never changes your CV for a
single job, and never overwrites a version you already have. When it needs any of that, it stops
and asks you.

## ❓ Why a CLI and not an MCP server?

| | CLI | MCP server |
| :--- | :--- | :--- |
| **Which agents** | every agent that can run a command, such as Claude Code, Codex or Gemini CLI, and people at a terminal | clients that run the server process and list it in their settings |
| **Agent's context** | asks `oriko schema` only for the command it needs | most clients load the description of every tool up front, used or not |

oriko reads and writes plain files on your computer, so you can check, script and test every step
yourself. An MCP server could wrap the CLI later without changing it. Justin Poehnelt's article
[Rewrite your CLI for AI agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/)
calls this serving several surfaces from one tool.

---

[← Back to the README](../README.md)
