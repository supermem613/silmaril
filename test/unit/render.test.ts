import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { renderMarkdown } from "../../src/pipeline/render.js";

describe("renderMarkdown", () => {
  it("renders common engineering Markdown", () => {
    const html = renderMarkdown("Use **strong** text.\n\n```ts\nconst answer = 42;\n```");
    assert.match(html, /<strong>strong<\/strong>/);
    assert.match(html, /language-ts/);
    assert.match(html, /const/);
  });
});
