import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { inlineMarkdown } from "../../src/pipeline/inline.js";
import { renderMermaidBlock } from "../../src/pipeline/mermaid.js";
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

  // Diamond keeps <br/> as two lines rendered via tspans.
  assert.match(first, /<tspan[^>]*>Lean Router<\/tspan>/);
  assert.match(first, /<tspan[^>]*>~1 screen<\/tspan>/);
  // Decision node renders as a diamond polygon with a shape-specific class.
  assert.match(first, /<polygon class="mermaid-node mermaid-node--diamond"/);
  const diamond = first.match(
    /<polygon class="mermaid-node mermaid-node--diamond" points="([\d.]+),([\d.]+) ([\d.]+),([\d.]+) ([\d.]+),([\d.]+) ([\d.]+),([\d.]+)"/,
  );
  assert.ok(diamond);
  assert.equal(Number(diamond[3]) - Number(diamond[7]), Number(diamond[6]) - Number(diamond[2]));
  // Process nodes carry a rect shape class distinct from the diamond.
  assert.match(first, /<rect class="mermaid-node mermaid-node--rect"/);
  // Edges stay straight until a compact rounded turn into the target.
  assert.match(first, /<path class="mermaid-edge" d="M [^"]+ L [^"]+ Q [^"]+"/);
  const branchPaths = [...first.matchAll(
    /<path class="mermaid-edge" d="M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+) Q ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)"[^>]*marker-end/g,
  )].slice(1);
  assert.equal(branchPaths.length, 4);
  assert.equal(new Set(branchPaths.map((path) => path[1])).size, 4);
  for (const path of branchPaths) {
    assert.equal(path[5], path[7]);
    assert.ok(Math.abs(Number(path[8]) - Number(path[6])) <= 18);
  }
  const edgeLabels = [...first.matchAll(
    /<text class="mermaid-edge-label" x="([\d.-]+)" y="([\d.-]+)"[^>]*>([^<]+)<\/text>/g,
  )];
  assert.equal(edgeLabels.length, 4);
  for (const [index, label] of edgeLabels.entries()) {
    assert.equal(label[1], branchPaths[index]?.[7]);
    assert.equal(Number(branchPaths[index]?.[8]) - Number(label[2]), 29);
  }
  // Arrowheads are filled markers, not stroked chevrons.
  assert.match(first, /<path class="mermaid-arrowhead"/);
  // Edge labels are rendered.
  assert.match(first, /match A/);
  assert.match(first, /reference-a\.md/);
  // Dotted edge for the no-match branch.
  assert.match(first, /stroke-dasharray/);
});

test("multi-line decision text stays inside a square diamond", () => {
  const svg = renderMermaidBlock("flowchart TD\nA{Longest line<br/>middle<br/>last}");
  const diamond = svg.match(
    /<polygon class="mermaid-node mermaid-node--diamond" points="([\d.]+),([\d.]+) ([\d.]+),([\d.]+) ([\d.]+),([\d.]+) ([\d.]+),([\d.]+)"/,
  );
  assert.ok(diamond);
  const width = Number(diamond[3]) - Number(diamond[7]);
  const height = Number(diamond[6]) - Number(diamond[2]);
  assert.equal(width, height);
  assert.ok(width >= 140);
});

test("router flowchart drops styling directives instead of rendering them as nodes", () => {
  const { content } = buildRouterDeck();

  // The rendered diagram must not turn directives into nodes.
  assert.doesNotMatch(content, /classDef/);
  assert.doesNotMatch(content, /class R thin/);
  // The stray raw router token must not leak into a node label.
  assert.doesNotMatch(content, /Lean Router&lt;br/);
});
