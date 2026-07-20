import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emitJsonFailure, emitJsonSuccess } from "../output.js";
import { parseHeadingBoard, parseScene } from "../pipeline/parse.js";
import { layoutScene, selectSparseLayoutPatch } from "../pipeline/layout.js";
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

const PACKAGE_MANIFEST = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json"), "utf8"),
) as {
  version: string;
  repository?: { url?: string };
};
const PACKAGE_VERSION = PACKAGE_MANIFEST.version;
const PACKAGE_REPOSITORY_URL = PACKAGE_MANIFEST.repository?.url;

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
    const themeName = opts.theme ?? scene.theme ?? "engineering";
    if (themeName !== "cards" && themeName !== "atlas" && themeName !== "sketch" && themeName !== "engineering") {
      throw buildError("--theme must be one of cards, atlas, sketch, engineering");
    }

    const theme = getTheme(themeName);
    const boardMode = themeName === "engineering";
    const inputTitle = basename(inputPath, extname(inputPath));
    const parsedBoard = boardMode ? parseHeadingBoard(markdown, inputTitle) : scene;
    const regions = boardMode
      ? (parsedBoard as ReturnType<typeof parseHeadingBoard>).slides
      : (parsedBoard as ReturnType<typeof parseScene>).regions;
    const sceneSteps = regions.map((region) => ({
      id: region.id,
      title: region.title,
      groupId: region.groupId,
      x: region.attrs.x,
      y: region.attrs.y,
      scale: region.attrs.scale,
      rotate: region.attrs.rotate,
    }));
    const layout = layoutScene(sceneSteps);
    const layoutPlacements = new Map(
      [...layout.overview, ...layout.groups.flatMap((group) => group.steps)]
        .map((placement) => [placement.id, placement]),
    );

    const renderedRegions = regions.map((region) => {
      const content = renderRegion(inlineMarkdown(region.body, inputDirectory).markdown);
      const placement = layoutPlacements.get(region.id);
      const authoredPatch = selectSparseLayoutPatch({
        x: region.attrs.x === undefined ? undefined : placement?.x ?? region.attrs.x,
        y: region.attrs.y === undefined ? undefined : placement?.y ?? region.attrs.y,
        scale: region.attrs.scale === undefined ? undefined : placement?.scale ?? region.attrs.scale,
        rotate: region.attrs.rotate === undefined ? undefined : placement?.rotate ?? region.attrs.rotate,
      });

      return {
        id: region.id,
        title: region.title,
        content,
        markdownSource: region.body,
        ...authoredPatch,
      };
    });

    const documentTitle = boardMode
      ? (parsedBoard as ReturnType<typeof parseHeadingBoard>).title
      : (parsedBoard as ReturnType<typeof parseScene>).attrs.title;
    const html = assemble(theme, renderedRegions, {
      documentTitle,
      version: PACKAGE_VERSION,
      repositoryUrl: PACKAGE_REPOSITORY_URL,
    });
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
