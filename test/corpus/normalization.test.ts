import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { canonicalizeHtml, compareToPrototype } from "./harness.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("corpus normalization", () => {
  it("normalizes CRLF and LF HTML equally and requires repository LF coverage", () => {
    const crlfHtml = "<div>\r\n  <span>alpha</span>\r\n</div>";
    const lfHtml = "<div>\n  <span>alpha</span>\n</div>";

    assert.equal(canonicalizeHtml(crlfHtml), lfHtml);
    assert.equal(compareToPrototype(crlfHtml, lfHtml), true);

    const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const gitattributesPath = resolve(repositoryRoot, ".gitattributes");
    const gitattributes = readFileSync(gitattributesPath, "utf8");

    for (const [pattern, expectedRule] of [
      ["test/golden/*.html", "\\btext\\b.*\\beol=lf\\b"],
      ["examples/*.html", "\\btext\\b.*\\beol=lf\\b"],
      ["fixtures/prototypes/**", "-text\\b"],
    ] as const) {
      const escapedPattern = escapeRegExp(pattern);
      assert.match(
        gitattributes,
        new RegExp(`^${escapedPattern}\\s+.*${expectedRule}`, "m"),
        `missing ${pattern === "fixtures/prototypes/**" ? "byte-preserving" : "LF eol"} coverage for ${pattern}`
      );
    }
  });
});
