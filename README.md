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

The same source drives three deterministic repository examples:

- Shared source: [examples/silmaril-tour.md](examples/silmaril-tour.md)
- Cards theme: [examples/cards.html](examples/cards.html)
- Atlas theme: [examples/atlas.html](examples/atlas.html)
- Sketch theme: [examples/sketch.html](examples/sketch.html)

Use `--help` or `--version` for CLI metadata. `doctor` and `schema` emit JSON by default; `update --json` selects its machine-readable envelope.
