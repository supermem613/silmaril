# Silmaril

Silmaril compiles annotated Markdown into a deterministic single-file HTML canvas.

## Public surface

- `doctor` verifies the local environment.
- `schema` emits the machine-readable command catalog.
- `build` writes a presentation and accepts `--out`, `--theme`, `--emit-scene`, and `--open`. Without `--out`, it writes `<source-name>.html` in the system temp directory.
- `update` self-updates the checkout.

## Edit and export

Generated engineering Silmarils remain single-file `file://` artifacts. Their embedded Markdown is the durable source of truth.

On a focused slide, use **Edit** to open a Markdown textarea and accurate bundled live preview. Edits update the in-memory artifact only; they do not overwrite the original Markdown file. Use **Export Markdown** to save the title and every current slide in order. Supported browsers use the File System Access API, with a browser download fallback when that API is unavailable.

The whole-board overview shows `silmaril · <version>` in the bottom-right corner, using package/build metadata. The product name links to the Silmaril repository in a new tab. Engineering `**bold**` text uses separate dark and light amber tokens that meet WCAG AA contrast, and the live preview matches the rendered slide.

## Learn more

- Authoring guide: [docs/authoring.md](docs/authoring.md)
- Schema reference: [docs/schema.md](docs/schema.md)
- Runnable example: [docs/examples/quick.md](docs/examples/quick.md)

## Quick example

```bash
node dist/cli.js build docs/examples/quick.md
```

Plain Markdown is the default: `#` becomes the presentation title and each `##` becomes an engineering slide. When `#` is omitted, the Markdown filename becomes the presentation title, which keeps Obsidian notes presentation-ready without extra metadata. The presentation opens on a whole-board overview derived from the actual slide bounds. Pass `--theme` only when selecting a legacy theme, or `--out` to choose the output path.

The `engineering` theme uses `#` for the board title and `##` for ordered slides. Fenced Mermaid flowcharts are compiled into deterministic inline SVG during the build, with no Mermaid runtime or remote diagram dependency in the generated HTML.

## Showcase

Each theme ships with the annotated Markdown that produces its accepted presentation:

| Theme | Markdown source | Generated presentation |
| --- | --- | --- |
| Cards | [examples/cards-tour.md](examples/cards-tour.md) | [examples/cards.html](examples/cards.html) |
| Atlas | [examples/atlas-tour.md](examples/atlas-tour.md) | [examples/atlas.html](examples/atlas.html) |
| Sketch | [examples/sketch-tour.md](examples/sketch-tour.md) | [examples/sketch.html](examples/sketch.html) |

```bash
silmaril build examples/cards-tour.md --out examples/cards.html
silmaril build examples/atlas-tour.md --out examples/atlas.html
silmaril build examples/sketch-tour.md --out examples/sketch.html
```

The theme comes from each file's frontmatter. An explicit `--theme` still wins. The showcase sources intentionally preserve their accepted prototype layouts; ordinary presentations use the generic overview and placement contract.

Use `--help` or `--version` for CLI metadata. `doctor` and `schema` emit JSON by default; `update --json` selects its machine-readable envelope.
