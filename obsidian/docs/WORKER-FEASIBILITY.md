# Worker feasibility

## Decision

`UI_THREAD_DEBOUNCE_FALLBACK`

Run `renderDeck` on Obsidian's UI thread through `renderScheduler`. The scheduler
must debounce edits, save before rendering, and suppress stale results.

## Evidence

`node obsidian/esbuild.worker.mjs` exits successfully and produces a non-empty
2,048,191-byte `obsidian/worker.js`. The probe imports `renderDeck` through
`renderAdapter` and does not import the Obsidian runtime.

The generated worker module still contains external imports from `node:fs` and
`node:path`. Those modules are used by Silmaril's current render pipeline and
are not available in a browser Web Worker. Bundle creation alone therefore does
not prove that the worker can run in Obsidian.

## Labeled fallback

`WORKER`

Switch to the worker path only after the in-memory render pipeline no longer
depends on Node file-system and path modules, or after the plugin provides
worker-safe replacements and the manual runtime check passes.

## Render-latency goal

After the 250 ms edit debounce, a typical two-slide deck should update within
500 ms without blocking editor input. Measure this in Obsidian with the
developer tools performance panel.

## Manual ACCEPTANCE item

Open a real vault in Obsidian, edit a Silmaril deck in bursts, and confirm that
the preview updates from the saved buffer within the latency goal, ignores stale
renders, reports save or render failures, and remains responsive. Headless
bundle checks do not prove this runtime behavior.
