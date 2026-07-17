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
    const region = scene.regions[0];
    assert.equal(region.attrs.x, 10);
    assert.equal(region.attrs.group?.x, 5);
    assert.equal(region.attrs.group?.id, "nested-group");
    assert.equal("html" in scene, false);
  });

  it("preserves colon-bearing prose while parsing explicit positional attrs", () => {
    const markdown = readFileSync(new URL("../corpus/cases/grammar-colon-prose.md", import.meta.url), "utf8");
    const scene = parseScene(markdown) as SceneIR;
    const region = scene.regions[0];

    assert.equal(scene.regions.length, 1);
    assert.equal(region.body, "- Note: this matters");
    assert.equal(region.attrs.x, 10);
    assert.equal(region.attrs.y, 20);
    assert.equal(region.attrs.scale, 1.2);
    assert.equal(region.attrs.rotate, 45);
    assert.equal((region.attrs.group as { id: string }).id, "nested-group");
  });
});
