import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { emitJsonFailure, emitJsonSuccess } from "../output.js";
import { parseScene } from "../pipeline/parse.js";
import { layoutScene } from "../pipeline/layout.js";
import { renderRegion } from "../pipeline/render.js";
import { inlineMarkdown } from "../pipeline/inline.js";
import { assemble } from "../pipeline/assemble.js";
import { validateBuildOutput } from "../pipeline/validate.js";
import { emitSceneJson } from "../registry.js";
import { getTheme } from "../theme/registry.js";

export type BuildOptions = {
  out?: string;
  theme?: string;
  emitScene?: boolean;
  open?: boolean;
};

export type OpenOutput = (outputPath: string) => void;

export interface BuildDependencies {
  openOutput?: OpenOutput;
}

function buildTemporaryPath(outputPath: string): string {
  return `${outputPath}.${process.pid}.tmp`;
}

function normalizeOutputPath(outputPath: string): string {
  return isAbsolute(outputPath) ? outputPath : resolve(process.cwd(), outputPath);
}

function defaultOutputPath(inputPath: string): string {
  const sourceName = basename(inputPath, extname(inputPath));
  return join(tmpdir(), `${sourceName}.html`);
}

export function requestOpenOutput(
  outputPath: string,
  openOutput: OpenOutput,
): { requested: boolean; launched: boolean; target: string } {
  openOutput(outputPath);
  return { requested: true, launched: true, target: outputPath };
}

function launchDefaultApplication(outputPath: string): void {
  const command = process.platform === "win32"
    ? "explorer.exe"
    : process.platform === "darwin"
      ? "open"
      : "xdg-open";
  const child = spawn(command, [outputPath], {
    detached: true,
    stdio: "ignore",
  });
  child.once("error", (error) => {
    process.stderr.write(`Unable to open ${outputPath}: ${error.message}\n`);
  });
  child.unref();
}

export async function buildCommand(input: string, opts: BuildOptions, deps: BuildDependencies = {}): Promise<void> {
  const buildError = (hint: string): Error => new Error(hint);

  let tempPath: string | null = null;
  try {
    const inputPath = isAbsolute(input) ? input : resolve(process.cwd(), input);
    const outputPath = opts.out ? normalizeOutputPath(opts.out) : defaultOutputPath(inputPath);
    const inputDirectory = dirname(inputPath);
    const markdown = readFileSync(inputPath, "utf8");
    const scene = parseScene(markdown);
    const themeName = opts.theme ?? scene.theme ?? "cards";
    if (themeName !== "cards" && themeName !== "atlas" && themeName !== "sketch") {
      throw buildError("--theme must be one of cards, atlas, sketch");
    }

    const theme = getTheme(themeName);
    const sceneSteps = scene.regions.map((region) => ({
      id: region.id,
      title: region.title,
      groupId: region.groupId,
    }));
    layoutScene(sceneSteps);

    const renderedRegions = scene.regions.map((region) => ({
      id: region.id,
      title: region.title,
      content: renderRegion(inlineMarkdown(region.body, inputDirectory).markdown),
    }));

    const html = assemble(theme, renderedRegions);
    validateBuildOutput(html);

    const outputDirectory = dirname(outputPath);
    mkdirSync(outputDirectory, { recursive: true });
    tempPath = buildTemporaryPath(outputPath);
    writeFileSync(tempPath, html, "utf8");
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
    renameSync(tempPath, outputPath);
    tempPath = null;

    const openOutcome = opts.open
      ? requestOpenOutput(outputPath, deps.openOutput ?? launchDefaultApplication)
      : null;

    const data: Record<string, unknown> = {
      outputPath,
      byteCount: Buffer.byteLength(html, "utf8"),
      theme: themeName,
      open: openOutcome,
    };

    if (opts.emitScene) {
      data.scene = emitSceneJson(scene);
    }

    emitJsonSuccess("build", data);
    process.exit(0);
  } catch (error) {
    if (tempPath && existsSync(tempPath)) {
      rmSync(tempPath, { force: true });
    }
    const hint = error instanceof Error ? error.message : String(error);
    const errorCode = hint.includes("--out") || hint.includes("--theme") ? "invalid-options" : "build-failed";
    emitJsonFailure("build", errorCode, hint);
    process.exit(1);
  }
}
