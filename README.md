# Silmaril

Silmaril is a trivial, no-frills Markdown-to-slides pipeline for engineers: write headings, get a deterministic single-file HTML presentation.

```markdown
# Service rollout

## Current state

The new API serves 80% of traffic.

## Next step

Move the final cohort after the error budget review.
```

```sh
npm install
npm run build
node dist/cli.js build talk.md --out talk.html
```

The `#` heading is the presentation title. Each `##` heading starts a slide. If the title is omitted, Silmaril uses the Markdown filename. The output opens on the whole board, works offline, and contains its scripts, styles, local images, and Mermaid diagrams.

## Present

Use the arrow keys to move between slides. Focused-slide mode shows only the active slide with quiet edge cues for available previous and next slides. The board shows `silmaril · <version>` in the lower-right corner.

## Edit with live reload

Run `silmaril serve talk.md` to open the deck in a local server with live reload. Edit the Markdown in your own editor and the browser reloads on save, so the Markdown file stays the source of truth. Rendering is full fidelity, including Mermaid.

Strong emphasis uses the same amber treatment across dark and light modes with WCAG AA contrast.

## Commands

| Command | Purpose |
| --- | --- |
| `silmaril build <input>` | Build a single-file HTML presentation |
| `silmaril serve <input>` | Serve the deck locally with live reload and in-browser editing |
| `silmaril doctor` | Verify the local environment |
| `silmaril schema` | Print the machine-readable command catalog |
| `silmaril update` | Pull, install, and rebuild the checkout |

`build` accepts `--out <file>` and `--open`. Without `--out`, the HTML is written to the system temp directory. `serve` accepts `--port <port>` (default 5173) and `--open`.

See [the authoring guide](docs/authoring.md) for supported Markdown and [the schema guide](docs/schema.md) for command output. The authoring guide also documents `:::columns` blocks for side-by-side authoring.

## Development

```sh
npm test
npm run lint
npm run build
```
