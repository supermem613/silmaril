import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

async function loadHarness() {
  try {
    return await import("./harness.js");
  } catch {
    throw new Error("test/corpus/harness.ts or its exports are unimplemented");
  }
}

describe("corpus harness", () => {
  it("canonicalizes HTML line endings to LF", async () => {
    const { canonicalizeHtml } = await loadHarness();
    const source = "<div>\r\n  <span>alpha</span>\r\n</div>";
    assert.equal(canonicalizeHtml(source), "<div>\n  <span>alpha</span>\n</div>");
  });

  it("compares a prototype deterministically", async () => {
    const { compareToPrototype } = await loadHarness();
    const rendered = "<div data-id='a'>Alpha</div>";
    const prototype = "<div data-id='a'>Alpha</div>";
    assert.equal(compareToPrototype(rendered, prototype), true);
    assert.equal(compareToPrototype(rendered, "<div data-id='b'>Alpha</div>"), false);
  });

  it("extracts spatial transforms from assembled step markup", async () => {
    const { extractSpatialTransforms } = await loadHarness();
    const stepMarkup = `
      <div class="assembled-step">
        <div data-x="10" data-y="20" data-scale="1.5" data-rotate="45"></div>
      </div>
    `;
    const extracted = extractSpatialTransforms(stepMarkup);
    assert.deepEqual(extracted, { x: 10, y: 20, scale: 1.5, rotate: 45 });
  });

  it("loads a representative corpus case", async () => {
    const { loadCase } = await loadHarness();
    const loaded = loadCase("basic");
    assert.ok(loaded);
  });
});
