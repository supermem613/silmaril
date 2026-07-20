import { strict as assert } from "node:assert";
import { test } from "node:test";
import { auditDeterminism } from "../../src/pipeline/determinism.js";

test("the presentation is byte-identical across repeated builds", () => {
  const result = auditDeterminism();
  assert.equal(result.ok, true);
  assert.equal(result.sha256, result.repeatedSha256);
  assert.equal(result.consistent, true);
  assert.deepEqual(result.bannedPatternMatches, []);
});
