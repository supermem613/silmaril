import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { requestOpenOutput } from "../../src/commands/build.js";

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const cliPath = join(repoRoot, "dist", "cli.js");

function runCli(args: string[], cwd = repoRoot) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function readJson(stdout: string) {
  const trimmed = stdout.trim();
  assert.ok(trimmed.length > 0, "expected JSON output");
  return JSON.parse(trimmed) as Record<string, unknown>;
}

function writeTempMarkdown(dir: string, name: string, content: string): string {
  const inputPath = join(dir, name);
  writeFileSync(inputPath, content, "utf8");
  return inputPath;
}

describe("cli contract", () => {
  const tempDirs: string[] = [];
  const tempFiles: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
    for (const file of tempFiles.splice(0)) {
      rmSync(file, { force: true });
    }
  });

  it("keeps doctor and schema healthy", () => {
    const doctor = runCli(["doctor"]);
    assert.equal(doctor.status, 0, doctor.stderr || doctor.stdout);
    assert.equal(doctor.stderr, "", doctor.stderr);
    const doctorPayload = readJson(doctor.stdout) as { ok: boolean; command: string; data: { ok: boolean; checks: unknown[] }; warnings: string[] };
    assert.equal(doctorPayload.ok, true);
    assert.equal(doctorPayload.command, "doctor");
    assert.equal(typeof doctorPayload.data.ok, "boolean");
    assert.ok(Array.isArray(doctorPayload.data.checks));
    assert.deepEqual(doctorPayload.warnings, []);

    const schema = runCli(["schema"]);
    assert.equal(schema.status, 0, schema.stderr || schema.stdout);
    assert.equal(schema.stderr, "", schema.stderr);
    const schemaPayload = readJson(schema.stdout) as {
      ok: boolean;
      command: string;
      data: {
        schemaVersion: number;
        cliVersion: string;
        envelope: { stdout: string; stderr: string; successEnvelope: string[]; errorEnvelope: string[] };
        commands: Array<{
          path: string[];
          effect: string;
          input: { flags: Array<{ name: string; type: string; summary: string; choices?: string[] }> };
          examples: string[];
          output: { documented: boolean; schema?: string; coverage?: string[] };
        }>;
      };
      warnings: string[];
    };
    assert.equal(schemaPayload.ok, true);
    assert.equal(schemaPayload.command, "schema");
    assert.equal(schemaPayload.data.schemaVersion, 1);
    assert.equal(schemaPayload.data.cliVersion, "0.3.0");
    assert.equal(schemaPayload.data.envelope.stdout, "JSON only for non-interactive commands when --json or schema is used");
    assert.deepEqual(schemaPayload.data.envelope.successEnvelope, ["ok", "command", "data", "warnings"]);
    assert.deepEqual(schemaPayload.data.envelope.errorEnvelope, ["ok", "command", "error", "hint"]);
    assert.ok(schemaPayload.data.commands.every((command) => typeof command.effect === "string"));
    assert.ok(schemaPayload.data.commands.every((command) => Array.isArray(command.examples) && command.examples.length > 0));
    assert.ok(schemaPayload.data.commands.every((command) => typeof command.output.documented === "boolean"));

    const summarySchema = runCli(["schema", "doctor", "--summary"]);
    assert.equal(summarySchema.status, 0, summarySchema.stderr || summarySchema.stdout);
    assert.equal(summarySchema.stderr, "", summarySchema.stderr);
    const summaryPayload = readJson(summarySchema.stdout) as { ok: boolean; command: string; data: { commandCount: number; commandPaths: string[][] } };
    assert.equal(summaryPayload.ok, true);
    assert.equal(summaryPayload.command, "schema");
    assert.equal(summaryPayload.data.commandCount, 1);
    assert.deepEqual(summaryPayload.data.commandPaths, [["doctor"]]);
  });

  it("builds a presentation atomically and reports output metadata", () => {
    const dir = mkdtempSync(join(tmpdir(), "silmaril-build-"));
    tempDirs.push(dir);
    const markdownPath = writeTempMarkdown(
      dir,
      "scene.md",
      "---\ntitle: Demo\ntheme: cards\ncanvas:\n  width: 800\n  height: 600\n---\n\n- Alpha\n  - body\n",
    );
    const outPath = join(dir, "scene.html");

    const build = runCli(["build", markdownPath, "--out", outPath, "--theme", "cards"]);
    assert.equal(build.status, 0, build.stderr || build.stdout);
    assert.equal(build.stderr, "", build.stderr);
    const buildPayload = readJson(build.stdout) as {
      ok: boolean;
      command: string;
      data: { outputPath: string; byteCount: number; theme: string; open: null };
      warnings: string[];
    };
    assert.equal(buildPayload.ok, true);
    assert.equal(buildPayload.command, "build");
    assert.equal(buildPayload.data.outputPath, outPath);
    assert.equal(buildPayload.data.theme, "cards");
    assert.ok(typeof buildPayload.data.byteCount === "number" && buildPayload.data.byteCount > 0);
    assert.equal(buildPayload.data.open, null);
    assert.deepEqual(buildPayload.warnings, []);
    assert.ok(existsSync(outPath));

    const html = readFileSync(outPath, "utf8");
    assert.match(html, /<html/i);
    assert.match(html, /<body/i);
    assert.match(html, /<title>Demo<\/title>/i);
    assert.match(html, /<div class="step overview camera-overview"[^>]*data-id="overview"[^>]*data-scale="1\.1719"><\/div>/i);
    assert.match(html, /<h2>Alpha<\/h2>/i);
  });

  it("uses the frontmatter theme unless an explicit theme overrides it", () => {
    const dir = mkdtempSync(join(tmpdir(), "silmaril-build-"));
    tempDirs.push(dir);
    const markdownPath = writeTempMarkdown(
      dir,
      "scene.md",
      "---\ntitle: Demo\ntheme: sketch\n---\n\n- Alpha\n  - body\n",
    );
    const frontmatterOutPath = join(dir, "frontmatter.html");
    const overrideOutPath = join(dir, "override.html");

    const frontmatterBuild = runCli(["build", markdownPath, "--out", frontmatterOutPath]);
    assert.equal(frontmatterBuild.status, 0, frontmatterBuild.stderr || frontmatterBuild.stdout);
    const frontmatterPayload = readJson(frontmatterBuild.stdout) as { data: { theme: string } };
    assert.equal(frontmatterPayload.data.theme, "sketch");
    const frontmatterHtml = readFileSync(frontmatterOutPath, "utf8");
    assert.match(frontmatterHtml, /<title>Demo<\/title>/i);
    assert.match(frontmatterHtml, /<div class="step overview camera-overview"[^>]*data-id="overview"/i);
    assert.match(frontmatterHtml, /<h2 style="font-size:48px[^"]*">Alpha<\/h2>/);

    const overrideBuild = runCli(["build", markdownPath, "--out", overrideOutPath, "--theme", "atlas"]);
    assert.equal(overrideBuild.status, 0, overrideBuild.stderr || overrideBuild.stdout);
    const overridePayload = readJson(overrideBuild.stdout) as { data: { theme: string } };
    assert.equal(overridePayload.data.theme, "atlas");
    const overrideHtml = readFileSync(overrideOutPath, "utf8");
    assert.match(overrideHtml, /<title>Demo<\/title>/i);
    assert.match(overrideHtml, /<div class="step overview camera-overview"[^>]*data-id="overview"/i);
    assert.match(overrideHtml, /<h2>Alpha<\/h2>/);
  });

  it("uses heading-structured engineering slides by default without frontmatter", () => {
    const dir = mkdtempSync(join(tmpdir(), "silmaril-build-engineering-default-"));
    tempDirs.push(dir);
    const markdownPath = writeTempMarkdown(
      dir,
      "scene.md",
      "# Default Engineering Deck\n\n## Opening\n\nWelcome\n\n## Detail\n\nSupporting detail\n",
    );
    const outPath = join(dir, "scene.html");

    const build = runCli(["build", markdownPath, "--out", outPath]);
    assert.equal(build.status, 0, build.stderr || build.stdout);
    const payload = readJson(build.stdout) as { data: { theme: string } };
    assert.equal(payload.data.theme, "engineering");

    const html = readFileSync(outPath, "utf8");
    assert.match(html, /<title>Default Engineering Deck<\/title>/);
    assert.match(html, /engineering-board-title[\s\S]*Default Engineering Deck/);
    assert.match(html, /<h2>Opening<\/h2>/);
    assert.match(html, /<h2>Detail<\/h2>/);
  });

  it("uses the Markdown filename as the engineering title when no level-one heading exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "silmaril-build-obsidian-title-"));
    tempDirs.push(dir);
    const markdownPath = writeTempMarkdown(
      dir,
      "Obsidian Note.md",
      "## Opening\n\nWelcome\n\n## Detail\n\nSupporting detail\n",
    );
    const outPath = join(dir, "obsidian-note.html");

    const build = runCli(["build", markdownPath, "--out", outPath]);
    assert.equal(build.status, 0, build.stderr || build.stdout);

    const html = readFileSync(outPath, "utf8");
    assert.match(html, /<title>Obsidian Note<\/title>/);
    assert.match(html, /engineering-board-title[\s\S]*<h1>Obsidian Note<\/h1>/);
    assert.match(html, /<h2>Opening<\/h2>/);
    assert.match(html, /<h2>Detail<\/h2>/);
  });

  it("inlines local images relative to the markdown source", () => {
    const dir = mkdtempSync(join(tmpdir(), "silmaril-build-"));
    tempDirs.push(dir);
    const imageBytes = readFileSync(join(repoRoot, "test", "fixtures", "inline", "local.png"));
    writeFileSync(join(dir, "local.png"), imageBytes);
    const markdownPath = writeTempMarkdown(
      dir,
      "scene.md",
      "---\ntitle: Local image\n---\n\n- Diagram\n  ![Local diagram](./local.png)\n",
    );
    const outPath = join(dir, "scene.html");

    const build = runCli(["build", markdownPath, "--out", outPath, "--theme", "cards"]);
    assert.equal(build.status, 0, build.stderr || build.stdout);

    const html = readFileSync(outPath, "utf8");
    const expectedSource = `data:image/png;base64,${imageBytes.toString("base64")}`;
    assert.match(html, new RegExp(`<img[^>]+src="${expectedSource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    assert.match(html, /alt="Local diagram"/);
  });

  it("rejects remote images through the real build path", () => {
    const dir = mkdtempSync(join(tmpdir(), "silmaril-build-"));
    tempDirs.push(dir);
    const markdownPath = writeTempMarkdown(
      dir,
      "scene.md",
      "---\ntitle: Remote image\n---\n\n- Diagram\n  ![Remote diagram](https://example.com/diagram.png)\n",
    );
    const outPath = join(dir, "scene.html");

    const build = runCli(["build", markdownPath, "--out", outPath, "--theme", "cards"]);
    assert.equal(build.status, 1, build.stderr || build.stdout);

    const payload = readJson(build.stdout) as {
      ok: boolean;
      command: string;
      error: string;
      hint: string;
    };
    assert.equal(payload.ok, false);
    assert.equal(payload.command, "build");
    assert.equal(payload.error, "build-failed");
    assert.equal(payload.hint, "Remote asset reference is not allowed: https://example.com/diagram.png");
  });

  it("writes to a source-named file in the operating system temp directory when --out is omitted", () => {
    const dir = mkdtempSync(join(tmpdir(), "silmaril-build-"));
    tempDirs.push(dir);
    const sourceName = basename(dir);
    const markdownPath = writeTempMarkdown(dir, `${sourceName}.md`, "# Demo\n\n## Alpha\n\nbody\n");
    const outPath = join(tmpdir(), `${sourceName}.html`);
    tempFiles.push(outPath);

    const build = runCli(["build", markdownPath]);
    assert.equal(build.status, 0, build.stderr || build.stdout);
    const buildPayload = readJson(build.stdout) as {
      ok: boolean;
      command: string;
      data: { outputPath: string; theme: string };
    };
    assert.equal(buildPayload.ok, true);
    assert.equal(buildPayload.command, "build");
    assert.equal(buildPayload.data.outputPath, outPath);
    assert.equal(buildPayload.data.theme, "engineering");
    assert.ok(existsSync(outPath));
    assert.deepEqual(readdirSync(dir).filter((name) => name.endsWith(".html")), []);
  });

  it("emits stable scene JSON without opening an application", () => {
    const dir = mkdtempSync(join(tmpdir(), "silmaril-build-"));
    tempDirs.push(dir);
    const markdownPath = writeTempMarkdown(
      dir,
      "scene.md",
      "---\ntitle: Demo\n---\n\n- Alpha\n  - body\n",
    );
    const outPath = join(dir, "scene.html");

    const build = runCli(["build", markdownPath, "--out", outPath, "--emit-scene"]);
    assert.equal(build.status, 0, build.stderr || build.stdout);
    const buildPayload = readJson(build.stdout) as {
      ok: boolean;
      command: string;
      data: {
        outputPath: string;
        byteCount: number;
        scene?: string;
        open?: null;
      };
    };
    assert.equal(buildPayload.ok, true);
    assert.equal(buildPayload.command, "build");
    assert.ok(typeof buildPayload.data.scene === "string");
    assert.equal(buildPayload.data.open, null);
    const scene = JSON.parse(buildPayload.data.scene as string) as { id: string; regions: unknown[] };
    assert.equal(scene.id, "demo");
    assert.ok(Array.isArray(scene.regions));
    assert.ok(existsSync(outPath));
  });

  it("routes an explicit open request through the injected opener", () => {
    const target = join(repoRoot, "presentation.html");
    let openedPath: string | null = null;

    const outcome = requestOpenOutput(target, (path) => {
      openedPath = path;
    });

    assert.equal(openedPath, target);
    assert.deepEqual(outcome, {
      requested: true,
      launched: true,
      target,
    });
  });

  it("exposes schema effects, examples, output coverage, prefix filtering, summaries, and theme values", () => {
    const schema = runCli(["schema", "build"]);
    assert.equal(schema.status, 0, schema.stderr || schema.stdout);
    const schemaPayload = readJson(schema.stdout) as {
      ok: boolean;
      command: string;
      data: {
        commands: Array<{
          path: string[];
          effect: string;
          examples: string[];
          output: { coverage?: string[] };
          input: { flags: Array<{ name: string; choices?: string[] }> };
        }>;
      };
    };
    const buildSpec = schemaPayload.data.commands.find((command) => command.path[0] === "build");
    assert.ok(buildSpec);
    assert.equal(buildSpec.effect, "mutate-local");
    assert.ok(buildSpec.examples.length > 0);
    assert.deepEqual(buildSpec.output.coverage, ["filesystem", "stdout", "stderr"]);
    const themeFlag = buildSpec.input.flags.find((flag) => flag.name === "--theme");
    assert.deepEqual(themeFlag?.choices, ["cards", "atlas", "sketch"]);

    const summarySchema = runCli(["schema", "build", "--summary"]);
    assert.equal(summarySchema.status, 0, summarySchema.stderr || summarySchema.stdout);
    const summaryPayload = readJson(summarySchema.stdout) as { data: { commandCount: number; commandPaths: string[][] } };
    assert.equal(summaryPayload.data.commandCount, 1);
    assert.deepEqual(summaryPayload.data.commandPaths, [["build"]]);
  });
});
