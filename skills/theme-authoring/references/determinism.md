# Determinism reference

Golden tests compare the assembled HTML byte-for-byte, so themes must be deterministic.

## Rules

- Keep theme output based only on the incoming region data and the theme definition.
- Avoid random values, timestamps, or hidden global state.
- Preserve the incoming region order and keep IDs stable.
- If a theme uses seeded drawing or other internal randomness, reset the seed before each render.
- Return the same markup for repeated assembly runs with the same input.

## Practical examples

- The sketch theme resets its internal seeds before rendering each scene so the SVG output is stable.
- The example theme fixture keeps its HTML markup and placements stable across repeated assembly runs.
