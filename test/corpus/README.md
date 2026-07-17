# Corpus harness policy

## Prototype comparison

Prototype comparisons must use exact-byte equality after normalizing HTML line endings to LF. The harness should treat `\r\n` and `\r` as equivalent to `\n` before comparing rendered output to the prototype bytes.

## Representative assertions

The corpus harness should cover representative checks across the three assertion classes used by the witness:

- Structural assertions: validate the shape of assembled step markup and the presence of the expected wrapper and data attributes.
- Semantic assertions: validate that the case payload preserves the intended content, titles, and section ordering from the source fixture.
- Spatial assertions: validate that extracted transform values are parsed deterministically from the assembled step markup.

## Generated output validation

Generated outputs must pass the exact `node scripts/validate.mjs <html> --profile canvas --json` contract and remain self-contained/offline. The harness must not treat generated HTML or related artifacts as complete without this validator pass.

## Navigation and overview requirements

Every generated presentation must contain a labeled overview step and deterministic next/previous keyboard navigation through the authored route. The corpus policy also requires each generated presentation to remain self-contained/offline, with navigational behavior explicitly encoded in the authored route.

## Golden regeneration policy

Golden outputs and expected render artifacts are reviewed-only. Regeneration is permitted only through reviewed changes that update the goldens intentionally; the harness should not silently rewrite goldens during normal execution.
