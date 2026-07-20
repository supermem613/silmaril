import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { inlineMarkdown } from "../../src/pipeline/inline.js";
import { parseBoard } from "../../src/pipeline/parse.js";
import { renderMarkdown } from "../../src/pipeline/render.js";
import { buildPresentation } from "../../src/presentation/index.js";

function buildRouterDeck(): { deck: string; content: string } {
  const sourcePath = fileURLToPath(new URL("../fixtures/presentation/router-mermaid.md", import.meta.url));
  const source = readFileSync(sourcePath, "utf8");
  const board = parseBoard(source);
  const slides = board.slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    content: renderMarkdown(inlineMarkdown(slide.body, dirname(sourcePath)).markdown),
    markdownSource: slide.body,
  }));
  const deck = buildPresentation(slides, { documentTitle: board.title });
  const content = slides.map((slide) => slide.content).join("\n");
  return { deck, content };
}

test("router flowchart parses shapes, edge labels, and dotted edges", () => {
  const first = buildRouterDeck().deck;
  const second = buildRouterDeck().deck;

  assert.equal(first, second);
  assert.match(first, /<svg class="engineering-mermaid"/i);

  // Rhombus keeps <br/> as two lines rendered via tspans.
  assert.match(first, /<tspan[^>]*>Lean Router<\/tspan>/);
  assert.match(first, /<tspan[^>]*>~1 screen<\/tspan>/);
  // Decision node renders as a diamond polygon.
  assert.match(first, /<polygon class="mermaid-node"/);
  // Arrowheads are filled markers, not stroked chevrons.
  assert.match(first, /<path class="mermaid-arrowhead"/);
  // Edge labels are rendered.
  assert.match(first, /match A/);
  assert.match(first, /reference-a\.md/);
  // Dotted edge for the no-match branch.
  assert.match(first, /stroke-dasharray/);
});

test("router flowchart drops styling directives instead of rendering them as nodes", () => {
  const { content } = buildRouterDeck();

  // The rendered diagram must not turn directives into nodes.
  assert.doesNotMatch(content, /classDef/);
  assert.doesNotMatch(content, /class R thin/);
  // The stray raw router token must not leak into a node label.
  assert.doesNotMatch(content, /Lean Router&lt;br/);
});
