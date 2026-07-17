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
- `theme`: string, parsed as metadata for the scene; the current CLI build command still selects the theme with `--theme`.
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

The parser treats the first body paragraph as markdown content and preserves the order of regions. It also captures nested attribute blocks such as `group` and `x`, `y`, `scale`, `rotate` when they appear under a region.

## 3. Grouping and layout

Use a nested `group` block to keep regions together:

```md
- Overview
  Open the scene with a map-like overview.

- Detail
  - group:
    - id: evidence
  Add a focused detail card.
```

The current public build path uses deterministic auto-layout:

- overview regions (those without a group) render first;
- grouped regions render after the overview in the order they appear;
- the default grid is 3 columns with a 24px gap.

Manual placement values such as `x`, `y`, `scale`, and `rotate` are parsed into the scene IR, but the current CLI build path does not apply them from markdown. If you need manual placement today, use the programmatic layout API rather than the `build` command.

## 4. Markdown body rules

Region bodies are rendered as markdown. Silmaril sanitizes HTML and disables remote links and images. Local images are inlined into the final file, so the single HTML output stays self-hosted.

This means:

- raw HTML is escaped rather than emitted;
- remote image and link references are rejected;
- local assets are embedded as data URIs.

## 5. Themes

The `build` command accepts three themes through `--theme`:

- `cards`: a bold card stack with a dark background.
- `atlas`: a map-like canvas with an overview and pinned regions.
- `sketch`: a hand-drawn look with a sketch-font asset and a lighter palette.

The sketch theme is a good option for quick authoring because it makes the canvas feel visual without extra setup.

## 6. Determinism and self-hosting

Silmaril aims for deterministic output. The parser preserves region order, the layout engine uses stable placement rules, and the themes render from fixed assets. That makes it practical to compare two builds of the same markdown and expect the same HTML structure.

Self-hosting is part of the authoring contract: the build output is a single HTML file, local assets are inlined, and remote asset references are rejected. There is no separate ownership-validation command in the current public CLI; the authoring contract is enforced by the parser and renderer instead.

## 7. CLI entry points

Use the CLI to validate and build your scene:

- `doctor` checks the local environment.
- `schema` prints the public command catalog.
- `build` writes the HTML presentation.
- `update` self-updates the checkout.

The CLI supports global `--help` and `--version` flags. The `build` command adds `--emit-scene` for inspecting the parsed scene IR.
