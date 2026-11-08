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

    assert.equal(board.subtitle, "Request paths, **storage**,\nand recovery");
  });

  it("parses title-only and subtitle section slides", () => {
    const board = parseBoard([
      "# Architecture review",
      "",
      "## Architecture",
      ":::section",
      ":::",
      "",
      "## Architecture",
      ":::section",
      "Paths, storage, and recovery",
      ":::",
      "",
      "## Request path",
      "",
      "Slide body",
    ].join("\n"));

    assert.deepEqual(
      board.slides.map(({ kind, title, subtitle, body }) => ({ kind, title, subtitle, body })),
      [
        { kind: "section", title: "Architecture", subtitle: undefined, body: "" },
        { kind: "section", title: "Architecture", subtitle: "Paths, storage, and recovery", body: "" },
        { kind: "content", title: "Request path", subtitle: undefined, body: "\nSlide body" },
      ],
    );
  });

  it("rejects malformed section slide blocks", () => {
    assert.throws(
      () => parseBoard("## Architecture\n:::section\nPaths, storage, and recovery"),
      /unterminated section block/,
    );
    assert.throws(
      () => parseBoard("## Architecture\n:::section\nPaths, storage, and recovery\n:::\nSlide body"),
      /section block must be the entire slide body/,
    );
  });

  it("parses deck-wide footer blocks from the title preamble", () => {
    const board = parseBoard([
      "# Architecture review",
      "",
      ":::footer left",
      "![Logo](./logo.png) Acme Engineering",
      ":::",
      "",
      ":::footer right",
      "Internal · 2026",
      ":::",
      "",
      "## Request path",
      "",
      "Slide body",
    ].join("\n"));

    assert.equal(board.subtitle, undefined);
    assert.equal(board.footer?.left, "![Logo](./logo.png) Acme Engineering");
    assert.equal(board.footer?.right, "Internal · 2026");
  });

  it("rejects invalid deck-wide footer blocks", () => {
    assert.throws(
      () => parseBoard("# Deck\n\n:::footer left\nFirst\nSecond\n:::\n\n## Slide"),
      /footer left must contain exactly one non-empty line/,
    );
    assert.throws(
      () => parseBoard("# Deck\n\n:::footer center\nText\n:::\n\n## Slide"),
      /unknown footer side: center/,
    );
    assert.throws(
      () => parseBoard("# Deck\n\n:::footer left\nOne\n:::\n\n:::footer left\nTwo\n:::\n\n## Slide"),
      /duplicate footer block: left/,
    );
  });
});
