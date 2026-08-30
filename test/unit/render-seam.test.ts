import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import * as silmaril from "../../src/index.js";

describe("render export surface", () => {
  it("render is exported as a pure string-in/HTML-out function", () => {
    assert.equal(typeof silmaril.render, "function");

    const markdownString = "## Slide 1\n\nUse **strong** text.\n\n## Slide 2\n\nMore text.";
    const slideCount = (markdownString.match(/^##\s+/gm) ?? []).length;

    const firstRender = silmaril.render(markdownString, {});
    const secondRender = silmaril.render(markdownString, {});

    assert.equal(typeof firstRender.html, "string");
    assert.equal(typeof firstRender.slideCount, "number");
    assert.equal(firstRender.slideCount, slideCount);
    assert.match(firstRender.html, /<strong>strong<\/strong>/);
    assert.equal(firstRender.html, secondRender.html);
  });
});
