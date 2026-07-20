import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixturePath = path.join(repositoryRoot, "fixtures", "perf", "big-talk.md");

test("bench reports the byte length of the real build pipeline", () => {
  const benchmark = spawnSync(process.execPath, [path.join(repositoryRoot, "scripts", "bench.mjs"), fixturePath, "--json"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  assert.equal(benchmark.status, 0, benchmark.stderr || benchmark.stdout);

  const directory = mkdtempSync(path.join(os.tmpdir(), "silmaril-bench-"));
  const outputPath = path.join(directory, "big-talk.html");
  try {
    const build = spawnSync(
      process.execPath,
      [path.join(repositoryRoot, "dist", "cli.js"), "build", fixturePath, "--out", outputPath],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(build.status, 0, build.stderr || build.stdout);

    const metrics = JSON.parse(benchmark.stdout) as { totalMs: number; outBytes: number };
    assert.equal(metrics.outBytes, Buffer.byteLength(readFileSync(outputPath, "utf8"), "utf8"));
    assert.ok(Number.isFinite(metrics.totalMs));
    assert.ok(metrics.totalMs > 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
