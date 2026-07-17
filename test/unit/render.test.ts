import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { renderRegion } from "../../src/pipeline/render.js";

describe("renderRegion", () => {
  it("renders sanitized markdown regions with highlighted code and escaped scripts", () => {
    const markdown = readFileSync(new URL("../fixtures/render/region.md", import.meta.url), "utf8");

    assert.match(markdown, /```js/);
    assert.match(markdown, /<script>/);
    assert.match(markdown, /!\[diagram\]\(https:\/\/example\.com\/diagram\.png\)/);

    const html = renderRegion(markdown);

    assert.match(html, /<pre><code class="language-js"/);
    assert.match(html, /&lt;script&gt;/);
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("<img"));
  });
});
