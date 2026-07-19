import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

describe("parseHeadingBoard", () => {
  it("maps '#' to the board title and each '##' to an ordered slide with a stable slug id", async () => {
    const parserModule = await import("../../src/pipeline/parse.js");
    const parseHeadingBoard = parserModule.parseHeadingBoard;

    assert.equal(
      typeof parseHeadingBoard,
      "function",
      "expected board title and ordered '##' slides, but the heading-board parser derived no slides / is not exported",
    );

    const markdown = [
      "# Board Title",
      "",
      "## First Slide",
      "",
      "Paragraph",
      "",
      "```ts",
      "const answer = 42;",
      "```",
      "",
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
      "",
      "![diagram](./diagram.png)",
      "",
      "```mermaid",
      "graph TD",
      "A-->B",
      "```",
      "",
      "## Second Slide",
      "",
      "More body",
    ].join("\n");

    const board = parseHeadingBoard(markdown);

    assert.equal(board.title, "Board Title");
    assert.equal(board.slides.length, 2);
    assert.equal(board.slides[0].title, "First Slide");
    assert.equal(board.slides[0].id, "first-slide");
    assert.equal(
      board.slides[0].body,
      [
        "",
        "Paragraph",
        "",
        "```ts",
        "const answer = 42;",
        "```",
        "",
        "| A | B |",
        "| --- | --- |",
        "| 1 | 2 |",
        "",
        "![diagram](./diagram.png)",
        "",
        "```mermaid",
        "graph TD",
        "A-->B",
        "```",
      ].join("\n"),
    );
    assert.equal(board.slides[1].title, "Second Slide");
    assert.equal(board.slides[1].id, "second-slide");

    const boardWithoutSlides = parseHeadingBoard("# Board Title Only");
    assert.equal(boardWithoutSlides.title, "Board Title Only");
    assert.deepEqual(boardWithoutSlides.slides, []);

    const duplicateSlides = [
      "# Board Title",
      "",
      "## Same Name",
      "",
      "First body",
      "",
      "## Same Name",
      "",
      "Second body",
    ].join("\n");

    const duplicatedBoard = parseHeadingBoard(duplicateSlides);
    assert.equal(duplicatedBoard.slides[0].id, "same-name");
    assert.equal(duplicatedBoard.slides[1].id, "same-name-2");
  });
});
