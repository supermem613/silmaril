import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { inlineMarkdown } from "../../src/pipeline/inline.js";
import { renderMermaidBlockAsync, type MermaidRenderDiagnostic } from "../../src/pipeline/mermaidReal.js";
import { parseBoard } from "../../src/pipeline/parse.js";
import { renderMarkdown } from "../../src/pipeline/render.js";
import { renderMarkdownAsync } from "../../src/pipeline/render.js";
import { buildPresentation } from "../../src/presentation/index.js";

test("renders Mermaid fences as deterministic inline SVG", () => {
  const sourcePath = fileURLToPath(new URL("../fixtures/presentation/engineering-mermaid.md", import.meta.url));
  const source = readFileSync(sourcePath, "utf8");
  const board = parseBoard(source);
  const build = () => buildPresentation(
    board.slides.map((slide) => ({
      id: slide.id,
      title: slide.title,
      content: renderMarkdown(inlineMarkdown(slide.body, dirname(sourcePath)).markdown),
    })),
    { documentTitle: board.title },
  );
  const first = build();
  const second = build();

  assert.equal(first, second);
  assert.match(first, /<svg class="engineering-mermaid"/i);
  assert.match(first, /<svg class="engineering-mermaid"[^>]*\bwidth="[1-9]\d*"/i);
  assert.match(first, /<svg class="engineering-mermaid"[^>]*\bheight="[1-9]\d*"/i);
  assert.match(first, /System Overview/);
});

test("uses Mermaid layout groups instead of hand-built node rectangles", async () => {
  // Guards against CI hosts that have Playwright but no named system browser.
  const source = [
    "```mermaid",
    "flowchart LR",
    'CDP["CDP<br/>persistent data"] -->|approved extract| DB["DuckDB<br/>ephemeral M365 processor"]',
    'CS["C# control"] -->|commands| DB',
    "DB -->|results| CDP",
    "```",
  ].join("\n");

  const diagnostics: MermaidRenderDiagnostic[] = [];
  const html = await renderMarkdownAsync(
    source,
    async () => "",
    undefined,
    async (mermaidSource) => (
      await renderMermaidBlockAsync(mermaidSource, (diagnostic) => {
        diagnostics.push(diagnostic);
        process.stderr.write(`SILMARIL_MERMAID_DIAGNOSTIC ${JSON.stringify(diagnostic)}\n`);
      })
    ) ?? "",
  );

  const success = diagnostics.find((diagnostic) => diagnostic.stage === "success");
  assert.ok(success, "expected a successful Mermaid stage diagnostic");
  assert.ok(success.executablePath, "expected the selected browser executable");
  assert.equal(success.executableExists, true);

  assert.match(html, /<g class="nodes"/);
  assert.match(html, /<g class="[^"]*\bedgePaths\b[^"]*"/);
  assert.doesNotMatch(html, /mermaid-node mermaid-node--rect/);

  const viewBox = html.match(/viewBox="[+-]?[\d.]+ [+-]?[\d.]+ ([\d.]+) ([\d.]+)"/)?.slice(1);
  const dimensions = html.match(/<svg[^>]*width="(\d+)"[^>]*height="(\d+)"/)?.slice(1);
  assert.ok(viewBox, "expected a real Mermaid viewBox");
  assert.ok(dimensions, "expected intrinsic Mermaid width and height");
  assert.equal(Number(dimensions?.[0]), Math.ceil(Number(viewBox?.[0])));
  assert.equal(Number(dimensions?.[1]), Math.ceil(Number(viewBox?.[1])));
});

test("preserves dollar replacement tokens in real Mermaid labels", async () => {
  const source = [
    "```mermaid",
    "flowchart LR",
    'A["cost $& value"] --> B["next"]',
    "```",
  ].join("\n");

  const html = await renderMarkdownAsync(source, async () => "");

  assert.match(html, /\$&(?:amp;)?/);
  assert.doesNotMatch(html, /data-silmaril-mermaid/);
});

test("real Mermaid rendering is deterministic for repeated source", async () => {
  const source = [
    "```mermaid",
    "flowchart LR",
    'A["First"] --> B["Second"]',
    "```",
  ].join("\n");

  const first = await renderMarkdownAsync(source, async () => "");
  const second = await renderMarkdownAsync(source, async () => "");

  assert.equal(first, second);
});
