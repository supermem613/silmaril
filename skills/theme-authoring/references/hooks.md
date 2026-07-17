# Theme hooks reference

Use the exported hooks exactly as defined by the `Theme` contract.

## CSS hooks

- `globalCss` applies page-level CSS for the whole presentation shell.
- `sceneryCss` applies CSS for the scenery or step wrapper.
- `regionCss` applies CSS for the region-specific markup emitted by `renderRegion`.

The current pipeline renders these three hooks into the generated HTML head. The contract also carries `css` and `scenery`, but those are not consumed by the current renderer.

## Render hook

- `renderRegion(region, context)` returns the HTML for each region body. `region.content` is already sanitized HTML and should be inserted without a second escaping pass.
- The assembler wraps the returned markup in the shared step card.

## Layout hook

- `layout(regions, context)` returns placements for every region.
- When omitted, the assembler falls back to a stable sequential placement.

## Validation hook

- `validate(theme, regions)` returns `null`, `undefined`, a string, or an array of strings.
- The assembler throws if validation yields a non-empty string or array.
