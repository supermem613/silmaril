import { readFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";
import { createAsyncImageResolver, inlineImage } from "./inline.js";
import { parseBoard } from "./parse.js";
import { renderMarkdown, renderMarkdownAsync } from "./render.js";
import { validateBuildOutput } from "./validate.js";
import type { BoardIR } from "./types.js";
import { buildPresentation } from "../presentation/index.js";

export interface RenderOptions {
  readonly title?: string;
  readonly assetBaseDir?: string;
  readonly version?: string;
  readonly repositoryUrl?: string;
  readonly liveReload?: boolean;
  readonly resolveWikiImage?: (source: string) => string;
}

export type RenderPresentationOptions = RenderOptions;

export interface RenderedPresentation {
  readonly html: string;
  readonly slideCount: number;
}

function assemblePresentation(
  board: BoardIR,
  slides: Array<{ id: string; title: string; content: string }>,
  options: RenderOptions,
): RenderedPresentation {
  const html = buildPresentation(slides, {
    documentTitle: board.title,
    documentSubtitle: board.subtitle,
    version: options.version,
    repositoryUrl: options.repositoryUrl,
    liveReload: options.liveReload,
  });
  validateBuildOutput(html);
  return { html, slideCount: slides.length };
}

export function render(markdown: string, options: RenderOptions = {}): RenderedPresentation {
  const board = parseBoard(markdown, options.title ?? "presentation");
  const slides = board.slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    content: renderMarkdown(
      slide.body,
      (source) => inlineImage(source, options.assetBaseDir ?? process.cwd()),
      options.resolveWikiImage,
    ),
  }));
  return assemblePresentation(board, slides, options);
}

export async function renderAsync(markdown: string, options: RenderOptions = {}): Promise<RenderedPresentation> {
  const board = parseBoard(markdown, options.title ?? "presentation");
  const resolveImage = createAsyncImageResolver(options.assetBaseDir ?? process.cwd());
  const slides = [];
  for (const slide of board.slides) {
    slides.push({
      id: slide.id,
      title: slide.title,
      content: await renderMarkdownAsync(slide.body, resolveImage, options.resolveWikiImage),
    });
  }
  return assemblePresentation(board, slides, options);
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
    resolveWikiImage: options.resolveWikiImage,
  });
}

export function renderPresentationFromMarkdownAsync(
  markdown: string,
  inputPath: string,
  options: RenderPresentationOptions = {},
): Promise<RenderedPresentation> {
  return renderAsync(markdown, {
    ...options,
    title: basename(inputPath, extname(inputPath)),
    assetBaseDir: dirname(inputPath),
  });
}

export function renderPresentationFromFile(
  inputPath: string,
  options: RenderPresentationOptions = {},
): RenderedPresentation {
  const markdown = readFileSync(inputPath, "utf8");
  return renderPresentationFromMarkdown(markdown, inputPath, options);
}
