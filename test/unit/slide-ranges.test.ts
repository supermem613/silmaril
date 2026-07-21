import assert from "node:assert/strict";
import test from "node:test";
import { parseBoard, slideRanges } from "../../src/pipeline/parse.js";

const deck = [
  "---",
  "title: Deck",
  "tags: [a, b]",
  "---",
  "# My Deck",
  "",
  "Intro preamble.",
  "",
  "## First",
  "",
  "First body line.",
  "",
  "More first.",
  "",
  "## Second",
  "",
  "```mermaid",
  "flowchart LR",
  "  ## not a heading",
  "  A --> B",
  "```",
  "",
  "## First",
  "",
  "Duplicate-title body.",
  "",
].join("\n");

test("slideRanges dedupes repeated titles and ignores headings inside fences", () => {
  const ranges = slideRanges(deck);
  assert.deepEqual(ranges.map((range) => range.id), ["first", "second", "first-2"]);
  assert.deepEqual(ranges.map((range) => range.title), ["First", "Second", "First"]);
});

test("slideRanges boundaries drop frontmatter and preamble from slide bodies", () => {
  const board = parseBoard(deck);
  assert.equal(board.title, "My Deck");
  assert.deepEqual(board.slides.map((slide) => slide.id), ["first", "second", "first-2"]);
  assert.doesNotMatch(board.slides[0].body, /Intro preamble/, "expected preamble to stay out of the first slide body");
  assert.match(board.slides[1].body, /flowchart LR[\s\S]*## not a heading/, "expected fenced content to survive intact");
});
