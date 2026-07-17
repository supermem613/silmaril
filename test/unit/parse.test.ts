import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { parseScene } from "../../src/pipeline/parse.js";
import { type SceneIR } from "../../src/pipeline/types.js";

describe("parseScene", () => {
  it("builds an ordered unpositioned scene IR from the basic fixture", () => {
    const markdown = readFileSync(new URL("../fixtures/parse/basic.md", import.meta.url), "utf8");
    const scene = parseScene(markdown) as SceneIR;

    assert.equal(scene.id, "basic");
    assert.equal(scene.rawMarkdown, markdown);
    assert.equal(scene.attrs.title, "Basic");
    assert.equal(scene.attrs.theme, "sunset");
    assert.equal(scene.groupId, null);
    assert.equal(scene.theme, "sunset");
    assert.equal(scene.canvas?.width, 1000);
    assert.equal(scene.canvas?.height, 700);
    assert.equal("html" in scene, false);
  });
});
