import assert from "node:assert/strict";
import test from "node:test";
import { inlineMarkdown } from "../../src/pipeline/inline.js";
import { parseBoard } from "../../src/pipeline/parse.js";
import { renderMarkdown } from "../../src/pipeline/render.js";
import { buildPresentation } from "../../src/presentation/index.js";

test("columns integration > built HTML contains equal-width columns layout and a narrow/print stacking media query", () => {
  const markdown = `# Columns Integration Deck

## Slide 1

:::columns
Left column
---
Right column
:::
`;
  const board = parseBoard(markdown, "Columns Integration Deck");
  const slides = board.slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    markdownSource: slide.body,
    content: renderMarkdown(inlineMarkdown(slide.body, process.cwd()).markdown),
  }));
  const html = buildPresentation(slides, {
    documentTitle: board.title,
  });

  assert.ok(
    /<div class="columns">/.test(html) && /<div class="column">/.test(html),
    "assertion fails because the built HTML contains no columns container and no per-column elements",
  );

  const stylesheet = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)]
    .map((match) => match[1])
    .at(0) ?? "";
  const equalWidthRule = /\.columns[\s\S]*?display:\s*flex[\s\S]*?flex:\s*1(?:\s+1\s+0)?/i;
  const stackedMediaRule = /@media[\s\S]*?\.columns[\s\S]*?flex-direction:\s*column/i;

  assert.ok(
    equalWidthRule.test(stylesheet) && stackedMediaRule.test(stylesheet),
    "assertion fails because the built HTML stylesheet contains no equal-width .columns row rule and no @media rule that stacks .columns vertically",
  );
});
