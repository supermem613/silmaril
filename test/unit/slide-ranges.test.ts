import assert from "node:assert/strict";
import test from "node:test";
import { parseBoard, replaceSlideBody, slideRanges } from "../../src/pipeline/parse.js";

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

test("replaceSlideBody is a no-op when a body is replaced with its parsed value", () => {
  const board = parseBoard(deck);
  for (const slide of board.slides) {
    assert.equal(
      replaceSlideBody(deck, slide.id, slide.body),
      deck,
      `expected replacing ${slide.id} with its own body to be idempotent`,
    );
  }
});

test("replaceSlideBody rewrites one slide while preserving frontmatter and other slides", () => {
  const updated = replaceSlideBody(deck, "second", "New second body.");
  assert.ok(updated.startsWith("---\ntitle: Deck\ntags: [a, b]\n---\n# My Deck"), "expected frontmatter and title to survive");
  assert.doesNotMatch(updated, /flowchart LR/, "expected the old second-slide body to be replaced");

  const board = parseBoard(updated);
  assert.deepEqual(board.slides.map((slide) => slide.id), ["first", "second", "first-2"]);
  assert.equal(board.slides[0].body, "\nFirst body line.\n\nMore first.", "expected the first slide to be untouched");
  assert.equal(board.slides[1].body, "New second body.");
  assert.equal(board.slides[2].body, "\nDuplicate-title body.", "expected the trailing slide to be untouched");
});

test("replaceSlideBody preserves CRLF line endings", () => {
  const crlf = deck.replace(/\n/g, "\r\n");
  const updated = replaceSlideBody(crlf, "first", "Line one\nLine two");
  assert.ok(updated.includes("\r\n"), "expected CRLF endings to be preserved");
  assert.doesNotMatch(updated, /[^\r]\n/, "expected no bare LF endings to be introduced");
  assert.equal(parseBoard(updated).slides[0].body, "Line one\nLine two");
});

test("replaceSlideBody rejects an unknown slide id", () => {
  assert.throws(() => replaceSlideBody(deck, "missing", "body"), /unknown slide: missing/);
});
