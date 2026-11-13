import { readFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";
import { createAsyncImageResolver, inlineImage } from "./inline.js";
import { parseBoard } from "./parse.js";
import { renderMarkdown, renderMarkdownAsync } from "./render.js";
import { validateBuildOutput } from "./validate.js";
import type { BoardIR } from "./types.js";
import { buildPresentation } from "../presentation/index.js";
import type { PresentationSlide } from "../presentation/index.js";
import { buildDocument } from "../presentation/document.js";

export interface RenderOptions {
  readonly title?: string;
  readonly assetBaseDir?: string;
  readonly version?: string;
  readonly repositoryUrl?: string;
  readonly liveReload?: boolean;
  readonly resolveWikiImage?: (source: string) => string;
  readonly resolveMermaid?: (source: string) => Promise<string>;
}

export type RenderPresentationOptions = RenderOptions;

export interface RenderedPresentation {
  readonly html: string;
  readonly slideCount: number;
  readonly type: "presentation" | "document";
}

function assembleOutput(
  board: BoardIR,
  slides: readonly PresentationSlide[],
  options: RenderOptions,
  footer?: { left?: string; right?: string },
): RenderedPresentation {
  const html = board.type === "document"
    ? buildDocument(slides, {
      documentTitle: board.title,
      documentSubtitle: board.subtitle,
      documentFooter: footer,
      version: options.version,
      repositoryUrl: options.repositoryUrl,
      liveReload: options.liveReload,
    })
    : buildPresentation(slides, {
      documentTitle: board.title,
      documentSubtitle: board.subtitle,
      documentFooter: footer,
      version: options.version,
      repositoryUrl: options.repositoryUrl,
      liveReload: options.liveReload,
    });
  validateBuildOutput(html);
  return { html, slideCount: slides.length, type: board.type };
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
  resolveMermaid?: (source: string) => Promise<string>,
): Promise<{ left?: string; right?: string } | undefined> {
  if (!footer) {
    return undefined;
  }
  let left: string | undefined;
  if (footer.left) {
    left = await renderMarkdownAsync(footer.left, resolveImage, resolveWikiImage, resolveMermaid);
  }
  let right: string | undefined;
  if (footer.right) {
    right = await renderMarkdownAsync(footer.right, resolveImage, resolveWikiImage, resolveMermaid);
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
  return assembleOutput(board, slides, options, footer);
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
        content: await renderMarkdownAsync(slide.body, resolveImage, options.resolveWikiImage, options.resolveMermaid),
      });
    }
  }
  const footer = await renderFooterAsync(board.footer, resolveImage, options.resolveWikiImage, options.resolveMermaid);
  return assembleOutput(board, slides, options, footer);
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
