import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  layoutScene,
  type LayoutPatch,
  type LayoutStep,
} from "../../src/pipeline/layout.js";

describe("layoutScene", () => {
  it("exposes a deterministic pure layout seam", () => {
    const steps: readonly LayoutStep[] = [
      { id: "intro", title: "Intro", groupId: null },
      { id: "overview", title: "Overview", groupId: "g1" },
      { id: "details", title: "Details", groupId: "g1" },
      { id: "closing", title: "Closing", groupId: "g2" },
    ];

    const overrides: Readonly<Record<string, LayoutPatch>> = {
      overview: { x: 2, y: 1, scale: 1.5 },
      closing: { rotate: 90 },
    };

    const first = layoutScene(steps, {
      gridColumns: 3,
      gridGap: 24,
      overrides,
    });
    const second = layoutScene(steps, {
      gridColumns: 3,
      gridGap: 24,
      overrides,
    });

    assert.deepEqual(first, second);
    assert.equal(first.grid.columns, 3);
    assert.equal(first.grid.gap, 24);
    assert.equal(first.overview[0]?.id, "intro");
    assert.equal(first.groups[0]?.steps[0]?.id, "overview");
    assert.equal(first.groups[0]?.steps[1]?.id, "details");
    assert.equal(first.groups[1]?.steps[0]?.id, "closing");
  });

  it("applies sparse manual overrides without disturbing other layout values", () => {
    const steps: readonly LayoutStep[] = [
      { id: "intro", title: "Intro", groupId: null },
      { id: "one", title: "One", groupId: "g1" },
      { id: "two", title: "Two", groupId: "g1" },
      { id: "three", title: "Three", groupId: "g2" },
    ];

    const result = layoutScene(steps, {
      gridColumns: 2,
      gridGap: 10,
      overrides: {
        one: { x: 4, scale: 1.25 },
        three: { rotate: 90 },
      },
    });

    assert.equal(result.groups[0]?.steps[0]?.x, 4);
    assert.equal(result.groups[0]?.steps[0]?.scale, 1.25);
    assert.equal(result.groups[0]?.steps[0]?.y, 0);
    assert.equal(result.groups[0]?.steps[0]?.rotate, 0);
    assert.equal(result.groups[1]?.steps[0]?.rotate, 90);
    assert.equal(result.groups[1]?.steps[0]?.x, 60);
  });

  it("uses a supplied themeLayout override", () => {
    const steps: readonly LayoutStep[] = [{ id: "solo", title: "Solo", groupId: null }];
    const result = layoutScene(steps, {
      gridColumns: 3,
      gridGap: 24,
      themeLayout: (sceneSteps) => {
        assert.equal(sceneSteps.length, 1);
        return {
          grid: { columns: 1, gap: 99 },
          overview: [{ id: "solo", title: "Solo", x: 1, y: 2, scale: 3, rotate: 4, groupId: null }],
          groups: [],
        };
      },
    });

    assert.equal(result.grid.columns, 1);
    assert.equal(result.grid.gap, 99);
    assert.equal(result.overview[0]?.x, 1);
  });
});
