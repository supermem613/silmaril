import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { buildSchema } from "../../src/registry.js";

const cliPath = resolve("dist/cli.js");

test("bare CLI prints the product version and command help", () => {
  const result = spawnSync(process.execPath, [cliPath], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^silmaril v\d+\.\d+\.\d+/);
  assert.match(result.stdout, /build \[options\] <input>/);
});

test("build emits a successful machine-readable result", () => {
  const directory = mkdtempSync(join(tmpdir(), "silmaril-cli-"));
  const inputPath = join(directory, "deck.md");
  const outputPath = join(directory, "deck.html");

  try {
    writeFileSync(inputPath, "# Demo\n\n## Intro\nHello\n", "utf8");
    const result = spawnSync(process.execPath, [cliPath, "build", inputPath, "--out", outputPath], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout) as { ok: boolean; data: { outputPath: string; slideCount: number } };
    assert.equal(payload.ok, true);
    assert.equal(payload.data.outputPath, outputPath);
    assert.equal(payload.data.slideCount, 1);
    assert.match(readFileSync(outputPath, "utf8"), /<h2>Intro<\/h2>/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("schema describes the complete build input", () => {
  const schema = buildSchema("0.4.0") as {
    commands: Array<{ path: string[]; input: { flags: Array<{ name: string }> } }>;
  };
  const build = schema.commands.find((command) => command.path[0] === "build");
  assert.ok(build);
  assert.deepEqual(build.input.flags.map((flag) => flag.name), ["--out", "--open"]);
});
