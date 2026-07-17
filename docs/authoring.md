# Silmaril authoring guide

Silmaril accepts a single markdown scene file and turns it into a deterministic single-file HTML canvas. The public entry point is `build`, and the underlying parser understands a compact frontmatter block plus a bullet-based region grammar.

## 1. Frontmatter

Start the file with a YAML-like frontmatter block delimited by `---` on the first and last lines:

```md
---
title: Quick sketch
theme: sketch
canvas:
  width: 1600
  height: 900
---
```

Supported frontmatter keys:

- `title`: string, used for the scene identifier and title fallback.
- `theme`: `cards`, `atlas`, or `sketch`. The CLI uses this value unless `--theme` overrides it.
- `canvas.width` and `canvas.height`: positive numbers for the scene canvas dimensions.

The parser accepts simple scalars (`true`, `false`, `null`, strings, numbers) and nested objects. Arrays are not part of the current grammar.

## 2. Region grammar

After the frontmatter, write one region per top-level bullet list item. The region title is the text of the bullet. Indented lines that follow belong to the region body.

```md
- Overview
  Start with the whole story in one glance.

- Detail
  Zoom in for supporting evidence.
```

The parser treats the body as markdown content and preserves region order. Use an explicit `@silmaril` block for placement metadata:

```md
- Detail
  - @silmaril:
    - x: 1700
    - y: -150
    - scale: 1
    - rotate: 6
  ## Slides are a line. Ideas are a place.

  Keep **spatial context** while you present.
```

Ordinary bullets containing colons remain presentation content. Legacy `x`, `y`, `scale`, `rotate`, and `group` bullets are still accepted for compatibility.

## 3. Grouping and layout

Use a nested group inside `@silmaril` to keep regions together:

```md
- Overview
  Open the scene with a map-like overview.

- Detail
  - @silmaril:
    - group:
      - id: evidence
  Add a focused detail card.
```

The current public build path uses deterministic auto-layout:

- overview regions (those without a group) render first;
- grouped regions render after the overview in the order they appear;
- the default grid is 3 columns with a 24px gap.

Manual `x`, `y`, `scale`, and `rotate` values flow through the public `build` command. Sparse placement is supported: author only the fields you want to override and the theme keeps its values for the rest.

## 4. Markdown body rules

Region bodies are rendered as markdown. Silmaril sanitizes HTML and disables remote links and images. Local images are inlined into the final file, so the single HTML output stays self-hosted.

This means:

- raw HTML is escaped rather than emitted;
- remote image and link references are rejected;
- local assets are embedded as data URIs.

## 5. Themes

The `build` command accepts three themes through frontmatter or `--theme`:

- `cards`: dark presentation cards with authored semantic emphasis and a zoomed-out map anchor.
- `atlas`: parchment location cards over one shared illustrated world.
- `sketch`: camera targets across one shared hand-drawn board.

The repository showcase sources demonstrate the richer conventions for each accepted presentation:

- [cards-tour.md](../examples/cards-tour.md)
- [atlas-tour.md](../examples/atlas-tour.md)
- [sketch-tour.md](../examples/sketch-tour.md)

If neither frontmatter nor `--theme` selects a theme, Silmaril uses `cards`. An explicit `--theme` always wins over frontmatter.

## 6. Determinism and self-hosting

Silmaril aims for deterministic output. The parser preserves region order, the layout engine uses stable placement rules, and the themes render from fixed assets. That makes it practical to compare two builds of the same markdown and expect the same HTML structure.

Self-hosting is part of the authoring contract: the build output is a single HTML file, local assets are inlined, and remote asset references are rejected. There is no separate ownership-validation command in the current public CLI; the authoring contract is enforced by the parser and renderer instead.

## 7. CLI entry points

Use the CLI to validate and build your scene:

- `doctor` checks the local environment.
- `schema` prints the public command catalog.
- `build` writes the HTML presentation. Without `--out`, the file is named after the markdown source and written to the operating system temp directory.
- `update` self-updates the checkout.

The CLI supports global `--help` and `--version` flags. The `build` command adds `--emit-scene` for inspecting the parsed scene IR.
