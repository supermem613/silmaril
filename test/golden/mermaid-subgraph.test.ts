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

const FORWARD_SUBGRAPH_SOURCE = `flowchart LR
  cron[Cron] --> outer
  invoke[Invoke] --> outer
  subgraph outer [Outer loop]
    direction LR
    triggers[Triggers] --> inner
    subgraph inner [Inner loop]
      direction TB
      bp[SIT blueprints]
      ef[Evaluation Findings]
      ff[Field Findings]
      syn[SIT synthetics]
      wf["Candidate Search and Promotion"]
      bp --> wf
      ef -.-> wf
      ff -.-> wf
      syn --> wf
    end
    inner --> patch[Git patch]
    patch --> pr[PR]
    patch --> fi[Factory improvements]
  end`;

type Rect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

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

function touchesBoundary(box: Rect | undefined, point: Point | undefined): boolean {
  if (!box || !point) {
    return false;
  }
  const right = Number((box.x + box.width).toFixed(2));
  const bottom = Number((box.y + box.height).toFixed(2));
  return ((point.x === box.x || point.x === right) && point.y >= box.y && point.y <= bottom)
    || ((point.y === box.y || point.y === bottom) && point.x >= box.x && point.x <= right);
}

test("forward-declared nested subgraphs render their eleven declared leaf nodes", () => {
  const svg = renderMermaidBlock(FORWARD_SUBGRAPH_SOURCE);

  assert.deepEqual(nodeLabels(svg).sort(), [
    "Cron",
    "Invoke",
    "Triggers",
    "SIT blueprints",
    "Evaluation Findings",
    "Field Findings",
    "SIT synthetics",
    "Candidate Search and Promotion",
    "Git patch",
    "PR",
    "Factory improvements",
  ].sort());
});

test("links to forward-declared nested subgraphs attach to the container boundaries", () => {
  const svg = renderMermaidBlock(FORWARD_SUBGRAPH_SOURCE);
  const [outer, inner] = subgraphRects(svg);
  const edges = [...svg.matchAll(
    /<path class="mermaid-edge" d="M ([\d.-]+) ([\d.-]+) L [\d.-]+ [\d.-]+ Q [\d.-]+ [\d.-]+ ([\d.-]+) ([\d.-]+)"/g,
  )].map((match) => ({
    from: { x: Number(match[1]), y: Number(match[2]) },
    to: { x: Number(match[3]), y: Number(match[4]) },
  }));

  assert.deepEqual([
    touchesBoundary(outer, edges[0]?.to),
    touchesBoundary(outer, edges[1]?.to),
    touchesBoundary(inner, edges[2]?.to),
    touchesBoundary(inner, edges[7]?.from),
  ], [true, true, true, true]);
});

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

// A node first referenced by an edge outside a subgraph, then listed inside the
// subgraph block, must still render inside that subgraph box. This mirrors the
// skills-structure talk diagram whose "optional dirs" box rendered empty because
// the skill-name --> dir edges were declared before the subgraph block.
const EDGE_BEFORE_SUBGRAPH_SOURCE = `flowchart LR
    root --> skill
    skill --> refs
    skill --> scripts
    skill --> tests
    skill --> evals
    skill --> other
    subgraph optional dirs
    refs[references/]
    scripts[scripts/]
    tests[tests/]
    evals[evals/]
    other[other]
    end`;

test("a node referenced by an edge before its subgraph block still renders inside that subgraph", () => {
  const svg = renderMermaidBlock(EDGE_BEFORE_SUBGRAPH_SOURCE);
  const boxes = subgraphRects(svg);
  const nodes = nodeRects(svg);

  assert.equal(boxes.length, 1, "the optional dirs subgraph box renders");
  const box = boxes[0];
  assert.ok(box);
  const inside = nodes.filter((node) => contains(box, node));
  assert.equal(
    inside.length,
    5,
    "all five directory nodes belong to the optional dirs subgraph even though their edges came first",
  );
});

test("a TB inter-subgraph edge stacks the loop box above the semantic-skills box", () => {
  const svg = renderMermaidBlock(SUBGRAPH_SOURCE);
  const boxes = subgraphRects(svg);
  const [first, second] = [...boxes].sort((a, b) => a.y - b.y);

  assert.ok(first && second);
  // The two boxes are vertically separated, not overlapping, so the TB edge reads top to bottom.
  assert.ok(second.y >= first.y + first.height - 1, "subgraph boxes stack without overlap");
});
