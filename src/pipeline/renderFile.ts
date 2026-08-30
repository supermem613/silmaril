import { readFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";
import { inlineMarkdown } from "./inline.js";
import { parseBoard } from "./parse.js";
import { renderMarkdown } from "./render.js";
import { validateBuildOutput } from "./validate.js";
import { buildPresentation } from "../presentation/index.js";

export interface RenderOptions {
  readonly title?: string;
  readonly assetBaseDir?: string;
  readonly version?: string;
  readonly repositoryUrl?: string;
  readonly liveReload?: boolean;
}

export type RenderPresentationOptions = RenderOptions;

export interface RenderedPresentation {
  readonly html: string;
  readonly slideCount: number;
}

export function render(markdown: string, options: RenderOptions = {}): RenderedPresentation {
  const board = parseBoard(markdown, options.title ?? "presentation");
  const slides = board.slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    content: renderMarkdown(inlineMarkdown(slide.body, options.assetBaseDir ?? process.cwd()).markdown),
  }));
  const html = buildPresentation(slides, {
    documentTitle: board.title,
    version: options.version,
    repositoryUrl: options.repositoryUrl,
    liveReload: options.liveReload,
  });
  validateBuildOutput(html);
  return { html, slideCount: slides.length };
}

export function renderPresentationFromMarkdown(
  markdown: string,
  inputPath: string,
  options: RenderPresentationOptions = {},
): RenderedPresentation {
  return render(markdown, {
    title: basename(inputPath, extname(inputPath)),
    assetBaseDir: dirname(inputPath),
    version: options.version,
    repositoryUrl: options.repositoryUrl,
    liveReload: options.liveReload,
  });
}

export function renderPresentationFromFile(
  inputPath: string,
  options: RenderPresentationOptions = {},
): RenderedPresentation {
  const markdown = readFileSync(inputPath, "utf8");
  return renderPresentationFromMarkdown(markdown, inputPath, options);
}
