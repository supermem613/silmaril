import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emitJsonFailure, emitJsonSuccess } from "../output.js";
import { inlineMarkdown } from "../pipeline/inline.js";
import { parseBoard } from "../pipeline/parse.js";
import { renderMarkdown } from "../pipeline/render.js";
import { validateBuildOutput } from "../pipeline/validate.js";
import { buildPresentation } from "../presentation/index.js";

export type BuildOptions = {
  out?: string;
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

function defaultOutputPath(inputPath: string): string {
  return join(tmpdir(), `${basename(inputPath, extname(inputPath))}.html`);
}

function launchDefaultApplication(outputPath: string): void {
  const command = process.platform === "win32"
    ? "explorer.exe"
    : process.platform === "darwin"
      ? "open"
      : "xdg-open";
  const child = spawn(command, [outputPath], { detached: true, stdio: "ignore" });
  child.once("error", (error) => {
    process.stderr.write(`Unable to open ${outputPath}: ${error.message}\n`);
  });
  child.unref();
}

export function requestOpenOutput(
  outputPath: string,
  openOutput: OpenOutput,
): { requested: boolean; launched: boolean; target: string } {
  openOutput(outputPath);
  return { requested: true, launched: true, target: outputPath };
}

export async function buildCommand(input: string, opts: BuildOptions, deps: BuildDependencies = {}): Promise<void> {
  let temporaryPath: string | null = null;

  try {
    const inputPath = isAbsolute(input) ? input : resolve(process.cwd(), input);
    const outputPath = opts.out
      ? (isAbsolute(opts.out) ? opts.out : resolve(process.cwd(), opts.out))
      : defaultOutputPath(inputPath);
    const markdown = readFileSync(inputPath, "utf8");
    const board = parseBoard(markdown, basename(inputPath, extname(inputPath)));
    const slides = board.slides.map((slide) => ({
      id: slide.id,
      title: slide.title,
      content: renderMarkdown(inlineMarkdown(slide.body, dirname(inputPath)).markdown),
      markdownSource: slide.body,
    }));
    const html = buildPresentation(slides, {
      documentTitle: board.title,
      version: PACKAGE_VERSION,
      repositoryUrl: PACKAGE_REPOSITORY_URL,
    });
    validateBuildOutput(html);

    mkdirSync(dirname(outputPath), { recursive: true });
    temporaryPath = `${outputPath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, html, "utf8");
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
    renameSync(temporaryPath, outputPath);
    temporaryPath = null;

    const open = opts.open
      ? requestOpenOutput(outputPath, deps.openOutput ?? launchDefaultApplication)
      : null;

    emitJsonSuccess("build", {
      outputPath,
      byteCount: Buffer.byteLength(html, "utf8"),
      slideCount: slides.length,
      open,
    });
    process.exit(0);
  } catch (error) {
    if (temporaryPath && existsSync(temporaryPath)) {
      rmSync(temporaryPath, { force: true });
    }
    emitJsonFailure("build", "build-failed", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
