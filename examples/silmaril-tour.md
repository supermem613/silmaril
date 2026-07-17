---
title: Silmaril tour
theme: cards
canvas:
  width: 1600
  height: 900
---

- Overview
  Start with a single glance at the story. Silmaril turns a compact scene into a zoomable presentation.

- Detail
  - group:
    - id: proof
  Keep the supporting evidence together in one cluster while the canvas carries the narrative from overview to detail.

- Code
  Use the same source to render each theme:

  ```sh
  node dist/cli.js build examples/silmaril-tour.md --out examples/cards.html --theme cards
  ```

- Close
  Open the generated file and step through the presentation with the same narrative in every theme.
