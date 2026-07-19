import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const publicThemes = ["cards", "atlas", "sketch"] as const;

test("build composes sparse authored placement over the theme layout", () => {
  const directory = mkdtempSync(join(tmpdir(), "silmaril-build-placement-"));
  const inputPath = join(directory, "placement.md");
  const outputPath = join(directory, "placement.html");

  try {
    writeFileSync(inputPath, `---
title: Placement
theme: sketch
---

- Intro
  Opening

- Detail
  - @silmaril:
    - x: 333
  Supporting detail
`, "utf8");

    const result = spawnSync(
      process.execPath,
      [resolve("dist/cli.js"), "build", inputPath, "--out", outputPath],
      { cwd: resolve("."), encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const html = readFileSync(outputPath, "utf8");
    const detailStep = html.match(/<div[^>]*id="detail"[^>]*>/)?.[0];

    assert.ok(detailStep);
    assert.match(detailStep, /data-x="333"/);
    assert.match(detailStep, /data-y="700"/);
    assert.match(detailStep, /data-scale="1.04"/);
    assert.match(detailStep, /data-rotate="-5"/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

for (const theme of publicThemes) {
  test(`build uses the authored presentation title for ${theme}`, () => {
    const directory = mkdtempSync(join(tmpdir(), `silmaril-build-title-${theme}-`));
    const inputPath = join(directory, "presentation.md");
    const outputPath = join(directory, "presentation.html");

    try {
      writeFileSync(inputPath, `---
title: Customer Skills Briefing
theme: ${theme}
---

- Opening
  Welcome

- Detail
  Supporting detail
`, "utf8");

      const result = spawnSync(
        process.execPath,
        [resolve("dist/cli.js"), "build", inputPath, "--out", outputPath],
        { cwd: resolve("."), encoding: "utf8" },
      );

      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.match(readFileSync(outputPath, "utf8"), /<title>Customer Skills Briefing<\/title>/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
