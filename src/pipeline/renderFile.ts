import { readFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";
import { createAsyncImageResolver, inlineImage } from "./inline.js";
import { parseBoard } from "./parse.js";
import { renderMarkdown, renderMarkdownAsync } from "./render.js";
import { validateBuildOutput } from "./validate.js";
import type { BoardIR } from "./types.js";
import { buildPresentation } from "../presentation/index.js";
import type { PresentationSlide } from "../presentation/index.js";

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
  slides: readonly PresentationSlide[],
  options: RenderOptions,
  footer?: { left?: string; right?: string },
): RenderedPresentation {
  const html = buildPresentation(slides, {
    documentTitle: board.title,
    documentSubtitle: board.subtitle,
    documentFooter: footer,
    version: options.version,
    repositoryUrl: options.repositoryUrl,
    liveReload: options.liveReload,
  });
  validateBuildOutput(html);
  return { html, slideCount: slides.length };
}

function renderFooter(
  footer: BoardIR["footer"],
  options: RenderOptions,
): { left?: string; right?: string } | undefined {
  if (!footer) {
    return undefined;
  }
  let left: string | undefined;
  if (footer.left) {
    left = renderMarkdown(
      footer.left,
      (source) => inlineImage(source, options.assetBaseDir ?? process.cwd()),
      options.resolveWikiImage,
    );
  }
  let right: string | undefined;
  if (footer.right) {
    right = renderMarkdown(
      footer.right,
      (source) => inlineImage(source, options.assetBaseDir ?? process.cwd()),
      options.resolveWikiImage,
    );
  }
  return {
    left,
    right,
  };
}

async function renderFooterAsync(
  footer: BoardIR["footer"],
  resolveImage: (source: string) => Promise<string>,
  resolveWikiImage?: (source: string) => string,
): Promise<{ left?: string; right?: string } | undefined> {
  if (!footer) {
    return undefined;
  }
  let left: string | undefined;
  if (footer.left) {
    left = await renderMarkdownAsync(footer.left, resolveImage, resolveWikiImage);
  }
  let right: string | undefined;
  if (footer.right) {
    right = await renderMarkdownAsync(footer.right, resolveImage, resolveWikiImage);
  }
  return {
    left,
    right,
  };
}

export function render(markdown: string, options: RenderOptions = {}): RenderedPresentation {
  const board = parseBoard(markdown, options.title ?? "presentation");
  const slides: PresentationSlide[] = [];
  for (const slide of board.slides) {
    if (slide.kind === "section") {
      slides.push({
        id: slide.id,
        title: slide.title,
        kind: "section",
        ...(slide.subtitle ? { subtitle: slide.subtitle } : {}),
      });
    } else {
      slides.push({
        id: slide.id,
        title: slide.title,
        kind: "content",
        content: renderMarkdown(
          slide.body,
          (source) => inlineImage(source, options.assetBaseDir ?? process.cwd()),
          options.resolveWikiImage,
        ),
      });
    }
  }
  const footer = renderFooter(board.footer, options);
  return assemblePresentation(board, slides, options, footer);
}

export async function renderAsync(markdown: string, options: RenderOptions = {}): Promise<RenderedPresentation> {
  const board = parseBoard(markdown, options.title ?? "presentation");
  const resolveImage = createAsyncImageResolver(options.assetBaseDir ?? process.cwd());
  const slides: PresentationSlide[] = [];
  for (const slide of board.slides) {
    if (slide.kind === "section") {
      slides.push({
        id: slide.id,
        title: slide.title,
        kind: "section",
        ...(slide.subtitle ? { subtitle: slide.subtitle } : {}),
      });
    } else {
      slides.push({
        id: slide.id,
        title: slide.title,
        kind: "content",
        content: await renderMarkdownAsync(slide.body, resolveImage, options.resolveWikiImage),
      });
    }
  }
  const footer = await renderFooterAsync(board.footer, resolveImage, options.resolveWikiImage);
  return assemblePresentation(board, slides, options, footer);
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
