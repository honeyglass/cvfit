# read/

Turns a document into clean text: a job posting, your notes, or an old CV.

The document can be a PDF, a Word file, a web page or plain text, as a file or a link. This
folder reads it, keeps only text that shows as itself, and hands that text to the agent, which
tailors the CV from it. A posting is kept beside its profile, so you can always see what a
version was made for.

A download only goes to a public address over https, and every file and download has a size
limit, because a document from outside can be anything.

## Parts

- **The command:** `oriko read` and where its text is stored.
- **Formats:** one reader each for PDF, Word and web pages, then one cleaning pass for all.
- **Downloads:** fetching a link safely.

---

[← Back to the README](../README.md)
