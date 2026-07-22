import assert from "node:assert/strict";
import test from "node:test";
import { renderMermaidBlock } from "../../src/pipeline/mermaid.js";

const SUBGRAPH_SOURCE = `flowchart TB
    subgraph L3[loop]
    direction LR
    C1[intake] --- C2[implement] --- C3[publish]
    end
    subgraph L2[Semantic Skills]
    direction LR
    I[Implement] --- F[Commit] --- D[Validate]
    end
    L3 --> L2`;

type Rect = { x: number; y: number; width: number; height: number };

function subgraphRects(svg: string): Rect[] {
  return [...svg.matchAll(
    /<rect class="mermaid-subgraph" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g,
  )].map((m) => ({ x: Number(m[1]), y: Number(m[2]), width: Number(m[3]), height: Number(m[4]) }));
}

function nodeRects(svg: string): Rect[] {
  return [...svg.matchAll(
    /<rect class="mermaid-node mermaid-node--rect" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g,
  )].map((m) => ({ x: Number(m[1]), y: Number(m[2]), width: Number(m[3]), height: Number(m[4]) }));
}

function nodeLabels(svg: string): string[] {
  return [...svg.matchAll(/<text class="mermaid-node-text"[^>]*>(.*?)<\/text>/g)]
    .map((m) => [...(m[1] ?? "").matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((t) => t[1]).join(" "));
}

function contains(box: Rect, inner: Rect): boolean {
  const cx = inner.x + inner.width / 2;
  const cy = inner.y + inner.height / 2;
  return cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height;
}

test("chained edges render one node per link instead of collapsing the tail into a label", () => {
  const svg = renderMermaidBlock(SUBGRAPH_SOURCE);
  const labels = nodeLabels(svg);

  // Every chained node keeps its own clean label. The pre-fix parser folded the
  // tail of a chain into the first target, producing labels like "implement --- C3[publish".
  assert.deepEqual(
    labels.sort(),
    ["Commit", "Implement", "Validate", "intake", "implement", "publish"].sort(),
  );
  for (const label of labels) {
    assert.doesNotMatch(label, /---|-->|\[|\]/, `node label leaked edge syntax: ${label}`);
  }
});

test("chained line produces an edge for every link", () => {
  const svg = renderMermaidBlock(SUBGRAPH_SOURCE);
  const edges = svg.match(/<path class="mermaid-edge"/g) ?? [];

  // Two links per subgraph plus the single inter-subgraph edge.
  assert.equal(edges.length, 5);

  // Only the L3 --> L2 connector carries an arrowhead. The --- chains stay plain.
  const arrowed = svg.match(/marker-end=/g) ?? [];
  assert.equal(arrowed.length, 1);
});

test("subgraphs render as labeled container boxes", () => {
  const svg = renderMermaidBlock(SUBGRAPH_SOURCE);

  const boxes = subgraphRects(svg);
  assert.equal(boxes.length, 2);

  const subgraphLabels = [...svg.matchAll(
    /<text class="mermaid-subgraph-label"[^>]*>(.*?)<\/text>/g,
  )].map((m) => [...(m[1] ?? "").matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((t) => t[1]).join(" "));
  assert.deepEqual(subgraphLabels.sort(), ["Semantic Skills", "loop"].sort());
});

test("each subgraph box contains its own member nodes", () => {
  const svg = renderMermaidBlock(SUBGRAPH_SOURCE);
  const boxes = subgraphRects(svg);
  const nodes = nodeRects(svg);

  assert.equal(nodes.length, 6);
  for (const box of boxes) {
    const inside = nodes.filter((node) => contains(box, node));
    assert.equal(inside.length, 3, "each subgraph holds exactly its three chained nodes");
  }
});

test("a TB inter-subgraph edge stacks the loop box above the semantic-skills box", () => {
  const svg = renderMermaidBlock(SUBGRAPH_SOURCE);
  const boxes = subgraphRects(svg);
  const [first, second] = [...boxes].sort((a, b) => a.y - b.y);

  assert.ok(first && second);
  // The two boxes are vertically separated, not overlapping, so the TB edge reads top to bottom.
  assert.ok(second.y >= first.y + first.height - 1, "subgraph boxes stack without overlap");
});
