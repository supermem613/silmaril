import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { inlineMarkdown } from "../../src/pipeline/inline.js";

describe("inlineMarkdown", () => {
  it("inlines local assets deterministically and rejects remote URLs", () => {
    const fixtureDir = new URL("../fixtures/inline/", import.meta.url);
    const previousCwd = process.cwd();
    process.chdir(fileURLToPath(fixtureDir));

    const localMarkdown = readFileSync(new URL("doc-with-local.md", fixtureDir), "utf8");
    const remoteMarkdown = readFileSync(new URL("doc-with-remote.md", fixtureDir), "utf8");

    const localHasLocalReference = /!\[[^\]]*\]\(\.\/local\.png\)/.test(localMarkdown);
    const remoteHasRemoteReference = /https?:\/\//.test(remoteMarkdown);

    if (!localHasLocalReference || !remoteHasRemoteReference) {
      throw new Error("inline fixtures were not initialized as expected");
    }

    const localFixtureBytes = readFileSync(new URL("local.png", fixtureDir));
    const expectedLocalMarkdown = `# Local asset\n\n![Inline local](data:image/png;base64,${localFixtureBytes.toString("base64")})\n`;
    const localResult = inlineMarkdown(localMarkdown);

    assert.equal(localResult.markdown.replace(/\r\n/g, "\n"), expectedLocalMarkdown);
    assert.throws(
      () => inlineMarkdown(remoteMarkdown),
      /Remote asset reference is not allowed: https:\/\/example\.com\/remote\.png/,
    );

    process.chdir(previousCwd);
  });
});
