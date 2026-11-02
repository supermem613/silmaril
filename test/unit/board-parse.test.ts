import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { parseBoard } from "../../src/pipeline/parse.js";

describe("parseBoard", () => {
  it("maps the document title and ordered slide headings", () => {
    const board = parseBoard([
      "# Board Title",
      "",
      "## First Slide",
      "",
      "Paragraph",
      "",
      "```ts",
      "## Not a slide",
      "```",
      "",
      "## Same Name",
      "Second body",
      "",
      "## Same Name",
      "Third body",
    ].join("\n"));

    assert.equal(board.title, "Board Title");
    assert.deepEqual(
      board.slides.map(({ id, title }) => ({ id, title })),
      [
        { id: "first-slide", title: "First Slide" },
        { id: "same-name", title: "Same Name" },
        { id: "same-name-2", title: "Same Name" },
      ],
    );
    assert.match(board.slides[0].body, /## Not a slide/);
  });

  it("uses the filename when the document has no title", () => {
    assert.equal(parseBoard("## Intro\nBody", "system-design").title, "system-design");
  });

  it("reads only the first paragraph after the deck title as a plain-text subtitle", () => {
    const board = parseBoard([
      "# Architecture review",
      "",
      "Request paths, **storage**,",
      "and recovery",
      "",
      "Other preamble text",
      "",
      "## Request path",
      "",
      "Slide body",
    ].join("\r\n"));

    assert.equal(board.subtitle, "Request paths, **storage**, and recovery");
  });
});
