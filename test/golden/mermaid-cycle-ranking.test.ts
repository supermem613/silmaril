import assert from "node:assert/strict";
import test from "node:test";
import { renderMermaidBlock } from "../../src/pipeline/mermaid.js";

function parseViewBoxHeight(svg: string): number {
  const match = svg.match(/<svg[^>]*viewBox="0 0 [\d.]+ ([\d.]+)"/);
  assert.ok(match, `Expected viewBox height in SVG: ${svg}`);
  return Number(match[1]);
}

test("cyclic ranking does not inflate viewBox height", () => {
  const cyclic = renderMermaidBlock("flowchart TD\nA-->B\nB-->C\nC-->A");
  const acyclic = renderMermaidBlock("flowchart TD\nA-->B\nB-->C");
  const cyclicHeight = parseViewBoxHeight(cyclic);
  const acyclicHeight = parseViewBoxHeight(acyclic);

  assert.ok(
    cyclicHeight <= acyclicHeight,
    `expected cyclic height ${cyclicHeight} <= acyclic height ${acyclicHeight}`,
  );
});

test("cyclic graph renders one edge path per edge including the back-edge", () => {
  const svg = renderMermaidBlock("flowchart TD\nA-->B\nB-->C\nC-->A");
  const edgePaths = svg.match(/<path class="mermaid-edge"/g) ?? [];

  assert.equal(edgePaths.length, 3);
});

test("TD back-edge approaches the target from above", () => {
  const svg = renderMermaidBlock("flowchart TD\nA-->B\nB-->C\nC-->A");
  const paths = [...svg.matchAll(/<path class="mermaid-edge" d="([^"]+)"/g)].map((match) => match[1]);
  const backEdge = paths.at(-1) ?? "";
  const finalSegments = [...backEdge.matchAll(/L ([\d.]+) ([\d.]+)/g)];
  assert.ok(finalSegments.length >= 3, `expected an outer-lane TD back-edge: ${backEdge}`);
  const approachX = finalSegments.at(-2)?.[1];
  const targetX = finalSegments.at(-1)?.[1];
  assert.equal(targetX, approachX, "expected the final target approach to be vertical");

  const nodes = [...svg.matchAll(/<rect class="mermaid-node mermaid-node--rect" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)]
    .map((match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
      width: Number(match[3]),
      height: Number(match[4]),
    }));
  const points = [...backEdge.matchAll(/(?:M|L) ([\d.]+) ([\d.]+)/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
  const source = points[0];
  const target = points.at(-1);
  const sourceNode = nodes.find((node) => source.x >= node.x && source.x <= node.x + node.width
    && source.y >= node.y && source.y <= node.y + node.height);
  const targetNode = nodes.find((node) => target && target.x >= node.x && target.x <= node.x + node.width
    && target.y >= node.y && target.y <= node.y + node.height);
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    for (const node of nodes) {
      if (node === sourceNode || node === targetNode) {
        continue;
      }
      if (Math.abs(from.y - to.y) < 0.01) {
        const lowX = Math.min(from.x, to.x);
        const highX = Math.max(from.x, to.x);
        assert.equal(
          !(from.y <= node.y || from.y >= node.y + node.height
            || highX <= node.x || lowX >= node.x + node.width),
          false,
          "TD back-edge access leg must not cross sibling cards",
        );
      } else if (Math.abs(from.x - to.x) < 0.01) {
        const lowY = Math.min(from.y, to.y);
        const highY = Math.max(from.y, to.y);
        assert.equal(
          !(from.x <= node.x || from.x >= node.x + node.width
            || highY <= node.y || lowY >= node.y + node.height),
          false,
          "TD back-edge access leg must not cross sibling cards",
        );
      }
    }
  }
});
