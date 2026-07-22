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
