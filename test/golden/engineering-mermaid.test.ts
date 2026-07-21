import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { inlineMarkdown } from "../../src/pipeline/inline.js";
import { parseBoard } from "../../src/pipeline/parse.js";
import { renderMarkdown } from "../../src/pipeline/render.js";
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
  assert.match(first, /System Overview/);
});
