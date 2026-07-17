---
title: Zoomable Canvas - Spike
theme: cards
---

- Intro
  - @silmaril:
    - x: 0
    - y: 0
    - scale: 1
  Spike · zoomable-canvas-presentation

  One canvas.  
  Not slides.
  ===========

  > A single map you zoom into, region by region, while you talk. This deck *is* the map — press ***`Space`*** to fly through it.

- Problem
  - @silmaril:
    - x: 1700
    - y: -150
    - scale: 1
  ### the itch

  Why bother

  ## Slides are a line. Ideas are a place.

  You want to open on the whole picture, then **zoom into a region**, talk, zoom to the next. The audience keeps **spatial context**: they always know where this bit lives on the map.

  > Author it in Markdown. Own the file. Present offline.

- Triangle
  - @silmaril:
    - x: 3450
    - y: 150
    - scale: 1
    - rotate: 6
  The tradeoff

  ## Pick two of three

  - **Precise positioning** — you place every region exactly.
  - **Effortless adding** — drop in a heading and it just lands.
  - **Free-form map feel** — the spatial story reads as one place.

  > Annotated Markdown + auto-layout buys ***positioning*** + ***map feel***, at some add-effort.

- Approaches
  - @silmaril:
    - x: 3450
    - y: 1750
    - scale: 1
    - rotate: 6
  Four ways

  ## What we weighed

  | Option | Verdict |
  | --- | --- |
  | **A. Validate-first Mapdeck** — prove the feel, then build an engine-neutral MD→scene compiler | **Recommended** |
  | **B. impress-coupled compiler** — build straight onto impress.js | ~~Reject as foundation~~ |
  | **C. Linear deck + overview map** | *Control / fallback* |
  | **D. Prezi (SaaS)** | ~~Dead end — not self-hosted~~ |

- Rec
  - @silmaril:
    - x: 1700
    - y: 1900
    - scale: 1
  ### the call

  Recommendation

  ## Validate the feel before writing the compiler.

  Hand-build one throwaway impress.js talk from real content. A/B it against a plain linear deck. If zoom genuinely helps the story, **freeze it as the golden fixture** and build the tool. If not, you spent an hour, not a fortnight.

- Pipeline
  - @silmaril:
    - x: -100
    - y: 1900
    - scale: 1
  The durable asset

  ## The pipeline, not the library

  `markdown` → `scene IR` → `pure layout` → `self-contained HTML`

  - Markdown carries content + **sparse** position overrides.
  - Layout is a pure `scene → positioned-scene` pass.
  - The camera engine (impress.js / Panzoom) is a **replaceable** last stage.
  - Reuse `/html`'s single-file packaging + `validate.js` for the ownership guarantee.

- Spike
  - @silmaril:
    - x: -1750
    - y: 1750
    - scale: 1
    - rotate: -6
  ### you are here

  This file

  ## What you're looking at

  A single self-contained `talk.html`. impress.js is **inlined** — no CDN, works offline, yours to keep. Ten regions on one canvas, laid out on a rough grid with a couple tilted for map texture.

  > This is the throwaway. Judge the *feel*, not the polish.

- Kill
  - @silmaril:
    - x: -1750
    - y: 150
    - scale: 1
    - rotate: -6
  Be honest

  ## Kill it if…

  - The overview isn't readable / orientation is lost.
  - Transitions feel like motion sickness, not narration.
  - Navigation is unpredictable under presenting pressure.
  - It's just ~~"slides scattered on a plane."~~
  - The plain linear deck told the story better.

- Next
  - @silmaril:
    - x: -100
    - y: -1600
    - scale: 1
  If it passes

  ## Then what

  - Freeze this HTML as the compiler's **golden fixture**.
  - Spec the scene IR + pure layout contract.
  - Build `mapdeck build talk.md --out talk.html`.
  - Decide impress.js vs Panzoom *after* the feel is proven.
