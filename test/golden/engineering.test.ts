import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { inlineMarkdown } from "../../src/pipeline/inline.js";
import { parseBoard } from "../../src/pipeline/parse.js";
import { renderMarkdown } from "../../src/pipeline/render.js";
import { validateBuildOutput } from "../../src/pipeline/validate.js";
import { buildPresentation } from "../../src/presentation/index.js";

function buildHtml(source: string, inputDirectory: string): string {
  const board = parseBoard(source);
  const html = buildPresentation(
    board.slides.map((slide) => ({
      id: slide.id,
      title: slide.title,
      content: renderMarkdown(inlineMarkdown(slide.body, inputDirectory).markdown),
    })),
    { documentTitle: board.title },
  );
  validateBuildOutput(html);
  return html.replace(/\r\n?/g, "\n");
}

test("builds the engineering presentation as a deterministic offline document", () => {
  const sourcePath = fileURLToPath(new URL("../fixtures/presentation/engineering-deck.md", import.meta.url));
  const source = readFileSync(sourcePath, "utf8");
  const first = buildHtml(source, dirname(sourcePath));
  const second = buildHtml(source, dirname(sourcePath));

  assert.equal(first, second);
  assert.match(first, /--dark-bg\s*:\s*#000000/i);
  assert.match(first, /class="step camera-overview engineering-board-overview"/);
  assert.match(first, /data-id="system-overview"/);
  assert.match(first, /data-id="operations-readiness"/);
  assert.doesNotMatch(first, /\b(?:src|href)=["']https?:/i);
});
