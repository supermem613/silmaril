import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../../src/pipeline/render.js";
import { buildPresentation } from "../../src/presentation/index.js";

test("renders an external markdown link as an anchor that opens in a new tab", () => {
  const html = renderMarkdown("See [Forge](https://github.com/microsoft/forge).");
  assert.match(
    html,
    /<a href="https:\/\/github\.com\/microsoft\/forge" target="_blank" rel="noreferrer noopener">Forge<\/a>/,
    "expected an external link to render a new-tab anchor",
  );
});

test("renders a mailto link as an external anchor", () => {
  const html = renderMarkdown("[Mail](mailto:team@example.com)");
  assert.match(html, /<a href="mailto:team@example\.com" target="_blank" rel="noreferrer noopener">Mail<\/a>/);
});

test("renders an internal fragment link as a same-document anchor without a new tab", () => {
  const html = renderMarkdown("[Jump](#operations-readiness)");
  assert.match(html, /<a href="#operations-readiness">Jump<\/a>/, "expected an internal fragment anchor");
  assert.doesNotMatch(html, /target="_blank"/, "internal links must not open a new tab");
});

test("drops a relative link to plain text so a deck stays free of dangling references", () => {
  const html = renderMarkdown("[Doc](report.html)");
  assert.doesNotMatch(html, /<a\b/, "expected no anchor for a relative link");
  assert.match(html, /Doc/, "expected the link label to survive as text");
});

test("never emits an anchor for a dangerous scheme", () => {
  const html = renderMarkdown("[x](javascript:alert(1))");
  assert.doesNotMatch(html, /<a\b/, "expected no anchor for a javascript: scheme");
  assert.doesNotMatch(html, /href=/, "expected no href to leak for a javascript: scheme");
});

test("gives each slide step an id so internal fragment links resolve to it", () => {
  const html = buildPresentation(
    [{ id: "operations-readiness", title: "Operations Readiness", content: "hi" }],
    { documentTitle: "Deck" },
  );
  assert.match(
    html,
    /<div id="operations-readiness"[^>]*class="step/,
    "expected the slide step to carry its slug id for hash navigation",
  );
});
