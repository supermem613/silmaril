import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { renderMarkdown } from "../../src/pipeline/render.js";

describe("renderMarkdown columns", () => {
  it("renders a :::columns block with one --- divider as two side-by-side column panels", () => {
    const html = renderMarkdown(":::columns\nFirst column\n---\nSecond column\n:::");
    assert.ok(
      /<div class="columns">/.test(html) &&
        /<div class="column">/.test(html) &&
        /First column/.test(html) &&
        /Second column/.test(html),
      "assertion fails because renderMarkdown output contains no columns container element and no per-column elements",
    );
  });

  it("renders three-or-more columns from two-or-more --- dividers", () => {
    const html = renderMarkdown(":::columns\nOne\n---\nTwo\n---\nThree\n:::");
    assert.ok(
      /<div class="columns">/.test(html) &&
        (html.match(/<div class="column">/g) ?? []).length === 3,
      "expected a columns container with three column elements",
    );
  });

  it("renders a :::columns block with no --- divider as a single full-width column", () => {
    const html = renderMarkdown(":::columns\nOnly column\n:::");
    assert.ok(
      /<div class="columns">/.test(html) &&
        (html.match(/<div class="column">/g) ?? []).length === 1 &&
        /Only column/.test(html),
      "expected a single full-width column inside the columns container",
    );
  });

  it("renders a nested Markdown list inside a column as a nested list", () => {
    const html = renderMarkdown(":::columns\n- Parent\n  - Child\n:::");
    assert.match(
      html,
      /<div class="columns">[\s\S]*<div class="column">[\s\S]*<ul>[\s\S]*<li>Parent[\s\S]*<ul>[\s\S]*<li>Child[\s\S]*<\/li>/,
    );
  });

  it("renders bold text inside a column as strong markup", () => {
    const html = renderMarkdown(":::columns\nUse **important** text.\n:::");
    assert.match(
      html,
      /<div class="columns">[\s\S]*<div class="column">[\s\S]*<strong>important<\/strong>[\s\S]*<\/div>[\s\S]*<\/div>/,
    );
  });

  it("keeps a local data URI image embedded inside a column", () => {
    const html = renderMarkdown(":::columns\n![alt](data:image/png;base64,AAAA)\n:::");
    assert.match(
      html,
      /<div class="columns">[\s\S]*<div class="column">[\s\S]*<img[^>]*src="data:image\/png;base64,AAAA"[\s\S]*<\/div>[\s\S]*<\/div>/,
    );
  });

  it("handles an unterminated :::columns block gracefully through end-of-input", () => {
    const html = renderMarkdown(":::columns\nCollected body");
    assert.ok(
      /<div class="columns">/.test(html) &&
        /<div class="column">/.test(html) &&
        /Collected body/.test(html) &&
        !html.includes(":::columns"),
      "expected the unterminated columns block to render as columns rather than leak the sigil",
    );
  });

  it("renders a top-level --- outside columns as a normal thematic break", () => {
    const html = renderMarkdown("---\n\nNormal paragraph");
    assert.ok(/<hr>/.test(html) && !/<div class="columns">/.test(html), "expected a thematic break and no columns container");
  });

  it("leaves fenced code blocks with ::: or --- content untouched", () => {
    const html = renderMarkdown("```ts\n:::columns\n---\n```\n");
    assert.ok(
      /<pre><code/.test(html) &&
        html.includes(":::columns") &&
        html.includes("---") &&
        !/<div class="columns">/.test(html),
      "expected code fences to remain literal and not trigger columns parsing",
    );
  });

  it("renders an empty column as an empty column element without collapsing the layout", () => {
    const html = renderMarkdown(":::columns\nLeft\n---\n:::");
    assert.match(
      html,
      /<div class="columns">[\s\S]*<div class="column">[\s\S]*Left[\s\S]*<\/div>[\s\S]*<div class="column"><\/div>[\s\S]*<\/div>/,
    );
  });
});
