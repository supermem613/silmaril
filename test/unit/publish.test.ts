import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("publish writes the heading deck with deterministic board placement", () => {
  const directory = mkdtempSync(join(tmpdir(), "silmaril-publish-"));
  const inputPath = join(directory, "presentation.md");
  const outputPath = join(directory, "presentation.html");

  try {
    const slides = Array.from({ length: 7 }, (_, index) => `## Slide ${index + 1}\nBody ${index + 1}`).join("\n\n");
    writeFileSync(inputPath, `# Customer Skills Briefing\n\n${slides}\n`, "utf8");
    const result = spawnSync(
      process.execPath,
      [resolve("dist/cli.js"), "publish", inputPath, "--out", outputPath],
      { cwd: resolve("."), encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const html = readFileSync(outputPath, "utf8");
    assert.match(html, /<title>Customer Skills Briefing<\/title>/);
    assert.match(html, /data-x="0" data-y="0" data-z="0" data-id="slide-1"/);
    assert.match(html, /data-x="1800" data-y="900" data-z="0" data-id="slide-6"/);
    const payload = JSON.parse(result.stdout) as { data: { slideCount: number } };
    assert.equal(payload.data.slideCount, 7);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("publish writes a scrolling document and reports its output type", () => {
  const directory = mkdtempSync(join(tmpdir(), "silmaril-publish-document-"));
  const inputPath = join(directory, "document.md");
  const outputPath = join(directory, "document.html");

  try {
    writeFileSync(inputPath, [
      "# Architecture review",
      "",
      ":::silmaril document",
      ":::",
      "",
      "## Context",
      "",
      "Natural-height body.",
    ].join("\n"), "utf8");
    const result = spawnSync(
      process.execPath,
      [resolve("dist/cli.js"), "publish", inputPath, "--out", outputPath],
      { cwd: resolve("."), encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const html = readFileSync(outputPath, "utf8");
    assert.match(html, /<body class="engineering-document">/);
    assert.match(html, /data-silmaril-document/);
    assert.doesNotMatch(html, /<div id="impress"/);
    const payload = JSON.parse(result.stdout) as { data: { type: string; slideCount: number } };
    assert.equal(payload.data.type, "document");
    assert.equal(payload.data.slideCount, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
