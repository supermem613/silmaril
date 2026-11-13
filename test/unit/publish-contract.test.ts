import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { buildSchema } from "../../src/registry.js";

const cliPath = resolve("dist/cli.js");

type Envelope = {
  command?: unknown;
  ok?: unknown;
  data?: {
    slideCount?: unknown;
    type?: unknown;
  };
  error?: unknown;
};

function parseEnvelope(stdout: string, label: string): Envelope {
  try {
    return JSON.parse(stdout) as Envelope;
  } catch (error) {
    assert.fail(`expected ${label} JSON output but received: ${stdout || String(error)}`);
  }
}

test("publish command emits a success envelope named \"publish\"", () => {
  const directory = mkdtempSync(join(tmpdir(), "silmaril-publish-"));
  const inputPath = join(directory, "deck.md");
  const outputPath = join(directory, "deck.html");

  try {
    writeFileSync(inputPath, "# Demo\n\n## Intro\nHello\n", "utf8");
    const result = spawnSync(process.execPath, [cliPath, "publish", inputPath, "--out", outputPath], {
      cwd: resolve("."),
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = parseEnvelope(result.stdout, "success");
    assert.equal(payload.command, "publish");
    assert.equal(payload.ok, true);
    assert.ok(payload.data && typeof payload.data === "object");
    assert.equal(typeof payload.data?.slideCount, "number");
    assert.ok(Number.isFinite(payload.data?.slideCount));
    assert.equal(payload.data?.type, "presentation");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("publish reports a JSON failure envelope for invalid input", () => {
  const directory = mkdtempSync(join(tmpdir(), "silmaril-publish-"));
  const missingInputPath = join(directory, "missing.md");
  const outputPath = join(directory, "out.html");

  try {
    const result = spawnSync(process.execPath, [cliPath, "publish", missingInputPath, "--out", outputPath], {
      cwd: resolve("."),
      encoding: "utf8",
    });

    const payload = parseEnvelope(result.stdout, "failure");
    assert.equal(payload.command, "publish");
    assert.equal(payload.error, "publish-failed");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("schema catalog exposes the publish command", () => {
  const schema = buildSchema("0.1.0") as {
    commands: Array<{ path: string[]; output?: { schema?: string } }>;
  };
  const publishCommand = schema.commands.find((command) => command.path.join(".") === "publish");

  if (!publishCommand) {
    assert.fail("expected the schema catalog to include a publish command");
  }

  assert.deepEqual(publishCommand.path, ["publish"]);
  assert.equal(publishCommand.output?.schema, "PublishResult");
});
