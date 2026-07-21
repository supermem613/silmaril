import { readFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";
import { inlineMarkdown } from "./inline.js";
import { parseBoard } from "./parse.js";
import { renderMarkdown } from "./render.js";
import { validateBuildOutput } from "./validate.js";
import { buildPresentation } from "../presentation/index.js";

export interface RenderPresentationOptions {
  readonly version?: string;
  readonly repositoryUrl?: string;
  readonly editor?: boolean;
  readonly liveReload?: boolean;
}

export interface RenderedPresentation {
  readonly html: string;
  readonly slideCount: number;
}

export function renderPresentationFromMarkdown(
  markdown: string,
  inputPath: string,
  options: RenderPresentationOptions = {},
): RenderedPresentation {
  const board = parseBoard(markdown, basename(inputPath, extname(inputPath)));
  const slides = board.slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    content: renderMarkdown(inlineMarkdown(slide.body, dirname(inputPath)).markdown),
    markdownSource: slide.body,
  }));
  const html = buildPresentation(slides, {
    documentTitle: board.title,
    version: options.version,
    repositoryUrl: options.repositoryUrl,
    editor: options.editor,
    liveReload: options.liveReload,
  });
  validateBuildOutput(html);
  return { html, slideCount: slides.length };
}

export function renderPresentationFromFile(
  inputPath: string,
  options: RenderPresentationOptions = {},
): RenderedPresentation {
  const markdown = readFileSync(inputPath, "utf8");
  return renderPresentationFromMarkdown(markdown, inputPath, options);
}
