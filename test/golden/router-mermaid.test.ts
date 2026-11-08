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

type Rect = { x: number; y: number; width: number; height: number };

function rects(svg: string, className: "mermaid-node mermaid-node--rect" | "mermaid-edge-label-bg"): Rect[] {
  const pattern = className === "mermaid-edge-label-bg"
    ? /<rect class="mermaid-edge-label-bg" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g
    : /<rect class="mermaid-node mermaid-node--rect" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g;
  return [...svg.matchAll(pattern)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4]),
  }));
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function segmentCrossesRect(from: { x: number; y: number }, to: { x: number; y: number }, rect: Rect): boolean {
  if (Math.abs(from.y - to.y) < 0.01) {
    const lowX = Math.min(from.x, to.x);
    const highX = Math.max(from.x, to.x);
    return from.y > rect.y
      && from.y < rect.y + rect.height
      && highX > rect.x
      && lowX < rect.x + rect.width;
  }
  if (Math.abs(from.x - to.x) < 0.01) {
    const lowY = Math.min(from.y, to.y);
    const highY = Math.max(from.y, to.y);
    return from.x > rect.x
      && from.x < rect.x + rect.width
      && highY > rect.y
      && lowY < rect.y + rect.height;
  }
  return false;
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

test("Duck Pond edge labels and nodes stay separated", () => {
  const svg = renderMermaidBlock(
    'flowchart LR\n'
    + 'CDP["CDP<br/>persistent data"] -->|approved extract| DB["DuckDB<br/>ephemeral M365 processor"]\n'
    + 'CS["C# control"] -->|commands| DB\n'
    + 'DB -->|results| CDP',
  );
  const nodes = rects(svg, "mermaid-node mermaid-node--rect");
  const labels = rects(svg, "mermaid-edge-label-bg");

  for (const [index, node] of nodes.entries()) {
    for (const other of nodes.slice(index + 1)) {
      assert.equal(overlaps(node, other), false, "node rectangles must not overlap");
    }
  }
  for (const label of labels) {
    for (const node of nodes) {
      assert.equal(overlaps(label, node), false, "edge labels must not overlap node rectangles");
    }
  }
  for (const [index, label] of labels.entries()) {
    for (const other of labels.slice(index + 1)) {
      assert.equal(overlaps(label, other), false, "edge labels must not overlap each other");
    }
  }

  const backEdge = [...svg.matchAll(/<path class="mermaid-edge" d="([^"]+)"/g)][2]?.[1] ?? "";
  assert.match(backEdge, /M [\d.]+ [\d.]+ L [\d.]+ [\d.]+ L [\d.]+ [\d.]+/, "back-edge should use an orthogonal route");
  const cdp = nodes.find((node) => node.y === 24);
  const duckDb = nodes.find((node) => node.x === 299 || node.x === 239);
  assert.ok(cdp, "expected CDP to occupy the target card");
  assert.ok(duckDb, "expected DuckDB to occupy the source card");
  const backEdgePoints = [...backEdge.matchAll(/(?:M|L) ([\d.]+) ([\d.]+)/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
  for (let index = 1; index < backEdgePoints.length; index += 1) {
    const from = backEdgePoints[index - 1];
    const to = backEdgePoints[index];
    for (const node of nodes) {
      if (node === cdp || node === duckDb) {
        continue;
      }
      assert.equal(
        segmentCrossesRect(from, to, node),
        false,
        "back-edge access leg must not cross sibling cards",
      );
    }
  }
  const finalPoint = backEdgePoints.at(-1);
  assert.ok(finalPoint, "expected the Duck Pond back-edge to reach CDP");
  assert.equal(finalPoint?.y, cdp?.y + cdp.height, "Duck Pond results edge should enter CDP from below");
  assert.equal(backEdgePoints[0]?.x, duckDb?.x, "Duck Pond results edge should leave DuckDB at its lower-left edge");
  assert.equal(backEdgePoints[0]?.y, duckDb?.y + duckDb.height, "Duck Pond results edge should leave DuckDB from the bottom");

  const forwardEdges = [...svg.matchAll(/<path class="mermaid-edge" d="([^"]+)"/g)].slice(0, 2);
  for (const [, path] of forwardEdges) {
    const move = path.match(/^M ([\d.]+) ([\d.]+)/);
    const line = path.match(/L ([\d.]+) ([\d.]+)/);
    assert.ok(move && line, `expected a horizontal-first LR edge: ${path}`);
    assert.equal(Number(line[2]), Number(move[2]), `expected LR edge to exit the source horizontally: ${path}`);
  }
});

test("router flowchart drops styling directives instead of rendering them as nodes", () => {
  const { content } = buildRouterDeck();

  // The rendered diagram must not turn directives into nodes.
  assert.doesNotMatch(content, /classDef/);
  assert.doesNotMatch(content, /class R thin/);
  // The stray raw router token must not leak into a node label.
  assert.doesNotMatch(content, /Lean Router&lt;br/);
});
