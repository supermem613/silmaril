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

## Present and edit

Use the arrow keys to move between slides. Focused-slide mode shows only the active slide with quiet edge cues for available previous and next slides.

Open the Markdown editor from the right-edge control drawer. Changes update the focused slide as a live preview, and the live preview matches the rendered slide. Browser edits are temporary; the Markdown file remains the source of truth.

Use **Export Markdown** to save the edited deck. Silmaril uses the File System Access API when available and a download fallback elsewhere. The board shows `silmaril · <version>` in the lower-right corner. Strong emphasis uses the same amber treatment in the slide and live preview with WCAG AA contrast in dark and light modes.

## Commands

| Command | Purpose |
| --- | --- |
| `silmaril build <input>` | Build a single-file HTML presentation |
| `silmaril doctor` | Verify the local environment |
| `silmaril schema` | Print the machine-readable command catalog |
| `silmaril update` | Pull, install, and rebuild the checkout |

`build` accepts `--out <file>` and `--open`. Without `--out`, the HTML is written to the system temp directory.

See [the authoring guide](docs/authoring.md) for supported Markdown and [the schema guide](docs/schema.md) for command output. The authoring guide also documents `:::columns` blocks for side-by-side authoring.

## Development

```sh
npm test
npm run lint
npm run build
```
