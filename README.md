# Silmaril

Silmaril compiles annotated Markdown into a deterministic single-file HTML canvas.

## Public surface

- `doctor` verifies the local environment.
- `schema` emits the machine-readable command catalog.
- `build` writes a presentation and accepts `--out`, `--theme`, `--emit-scene`, and `--open`. Without `--out`, it writes `<source-name>.html` in the system temp directory.
- `update` self-updates the checkout.

## Learn more

- Authoring guide: [docs/authoring.md](docs/authoring.md)
- Schema reference: [docs/schema.md](docs/schema.md)
- Runnable example: [docs/examples/quick.md](docs/examples/quick.md)

## Quick example

```bash
node dist/cli.js build docs/examples/quick.md
```

The frontmatter `theme` is used by default. Pass `--theme` to override it or `--out` to choose the output path.

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

The theme comes from each file's frontmatter. An explicit `--theme` still wins.

Use `--help` or `--version` for CLI metadata. `doctor` and `schema` emit JSON by default; `update --json` selects its machine-readable envelope.
