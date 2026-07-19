# Theme authoring

Use this skill when you need to add a new render theme for the zoomable canvas presentation pipeline.

## Contract at a glance

The exported contract lives in `src/theme/contract.ts`. A theme is a `Theme` object with optional hooks that the assembler and template can consume:

- `ThemeRegionDescriptor` describes each region as `{ id, title, content }`.
- `ThemeLayoutPlacement` describes the final slide placement as `{ id, title, x, y, z, scale, rotate }`.
- `ThemeAsset` describes an embeddable asset as `{ name?, content, mimeType?, type? }`.
- `Theme` holds the author-facing hooks for naming, colors, CSS, HTML rendering, overview behavior, optional layout and validation, and offline asset embedding.

## What to implement for a valid theme

A minimal valid theme should provide:

- a `name`
- `renderRegion` if you want region markup beyond the default paragraph fallback
- `validate` if you want to reject invalid region sets before assembly
- CSS hooks through `globalCss`, `sceneryCss`, and `regionCss`
- optional offline assets through `assets` or `embeddedAssets`

The current renderer consumes `globalCss`, `sceneryCss`, `regionCss`, and `scenery` when building the final HTML. The exported contract also includes `css`.

## Theme hooks and usage

- Use `globalCss` for page-level rules.
- Use `sceneryCss` for the step or scene wrapper styling.
- Use `regionCss` for the region markup created by `renderRegion`.
- Use `renderRegion` to wrap the sanitized HTML in `region.content`. Escape titles and other theme-owned text, but do not escape `region.content` again.
- Use `layout` when the theme needs custom placements; otherwise the assembler falls back to the default sequential layout.
- Use `overview: 'auto'` for ordinary presentations. The assembler emits an empty first overview centered from the actual placement bounds. Every generic layout must return a distinct placement for every region.
- Use `validate` to reject invalid themes before the HTML is rendered. The assembler throws when validation returns a non-empty string or array.
- Use `assets` or `embeddedAssets` when the theme needs offline data URIs or embedded CSS/JS/text.

Prototype-specific scenery, routes, or overview content must be gated by the complete accepted document signature. A near-match or ordinary deck must use the generic overview and distinct-placement contract instead of inheriting prototype copy or scenery.

## Determinism expectations

Themes must stay deterministic. The assembler compares HTML output byte-for-byte in golden tests, so avoid randomness, time-based values, unsorted IDs, or hidden state. If your theme uses randomness internally, reset it per render and keep the output stable across repeated assembly runs.

## Golden tests

Keep test-only themes in `test/fixtures/themes/` and do not register them in the public theme registry. The golden test should assemble the fixture theme twice, assert the HTML is identical on both runs, validate the HTML, and compare the assembled result to `test/golden/example-theme.html` exactly.
