import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import hljs from "highlight.js";
import { parseMarkdownSegments } from "./columns.js";
import { renderMermaidBlock } from "./mermaid.js";

const DEFAULT_RENDERER_OPTIONS = {
  html: false,
  linkify: false,
  typographer: false,
  xhtmlOut: false,
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type ClassifiedHref =
  | { readonly kind: "internal"; readonly href: string }
  | { readonly kind: "external"; readonly href: string }
  | { readonly kind: "none" };

// A deck stays self-contained, so only two link shapes may produce an anchor.
// Internal fragment links target a slide step by its slug id for hash navigation.
// External links are limited to http, https, and mailto so a relative or dangerous
// href collapses to plain text instead of a dangling or unsafe reference.
function classifyHref(href: string): ClassifiedHref {
  const value = href.trim();
  if (/^#[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) {
    return { kind: "internal", href: value };
  }
  if (/^(?:https?:\/\/|mailto:)/i.test(value)) {
    return { kind: "external", href: value };
  }
  return { kind: "none" };
}

function createMarkdownRenderer(
  resolveImage?: (source: string) => string,
  resolveWikiImage?: (source: string) => string,
): MarkdownIt {
  const markdownIt = new MarkdownIt(DEFAULT_RENDERER_OPTIONS);

  if (resolveWikiImage) {
    markdownIt.inline.ruler.before("image", "wiki_image", (state, silent) => {
      if (!state.src.startsWith("![[", state.pos)) {
        return false;
      }
      const end = state.src.indexOf("]]", state.pos + 3);
      if (end === -1) {
        return false;
      }
      const embed = state.src.slice(state.pos + 3, end);
      const separator = embed.indexOf("|");
      const reference = (separator === -1 ? embed : embed.slice(0, separator)).trim();
      const label = separator === -1 ? undefined : embed.slice(separator + 1).trim();
      if (embed.includes("\n") || !/\.(?:png|jpe?g|gif|svg|webp|avif)$/i.test(reference)) {
        return false;
      }
      if (!silent) {
        const token = state.push("image", "img", 0);
        token.attrs = [["src", resolveWikiImage(reference)], ["alt", ""]];
        const size = label?.match(/^([1-9]\d*)(?:x([1-9]\d*))?$/);
        token.content = size ? reference : (label || reference);
        if (size) {
          token.attrSet("width", size[1]);
          if (size[2]) {
            token.attrSet("height", size[2]);
          }
        }
      }
      state.pos = end + 2;
      return true;
    });
  }

  markdownIt.renderer.rules.code_inline = (tokens, index) => {
    const content = tokens[index]?.content ?? "";
    return `<code>${escapeHtml(content)}</code>`;
  };

  markdownIt.renderer.rules.code_block = (tokens, index) => {
    const content = tokens[index]?.content ?? "";
    return renderCodeBlock(content, "");
  };

  markdownIt.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const info = token?.info?.trim() ?? "";
    const content = token?.content ?? "";
    const language = info.split(/\s+/)[0] ?? "";
    if (language.toLowerCase() === "mermaid") {
      return renderMermaidBlock(content);
    }
    return renderCodeBlock(content, language);
  };

  // Links do not nest, so a stack keeps each link_close paired with the tag its
  // link_open produced. A dropped link pushes an empty close so the pairing holds.
  const linkCloseStack: string[] = [];
  markdownIt.renderer.rules.link_open = (tokens, index) => {
    const token = tokens[index];
    const href = typeof token?.attrGet === "function" ? token.attrGet("href") ?? "" : "";
    const link = classifyHref(href);
    if (link.kind === "internal") {
      linkCloseStack.push("</a>");
      return `<a href="${escapeHtml(link.href)}">`;
    }
    if (link.kind === "external") {
      linkCloseStack.push("</a>");
      return `<a href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer noopener">`;
    }
    linkCloseStack.push("");
    return "";
  };
  markdownIt.renderer.rules.link_close = () => linkCloseStack.pop() ?? "";

  markdownIt.renderer.rules.image = (tokens, index) => {
    const token = tokens[index];
    const altText = token?.content || (typeof token?.attrGet === "function" ? token.attrGet("alt") : "") || "";
    const reference = typeof token?.attrGet === "function" ? token.attrGet("src") : "";
    const source = reference && resolveImage ? resolveImage(reference) : reference;
    if (source && /^data:image\/(?:png|jpeg|gif|svg\+xml|webp|avif);base64,[a-z\d+/=]+$/i.test(source)) {
      const dimensions = ["width", "height"].map((name) => {
        const value = token.attrGet(name);
        return value ? ` ${name}="${escapeHtml(value)}"` : "";
      }).join("");
      return `<img src="${escapeHtml(source)}" alt="${escapeHtml(String(altText))}"${dimensions}>`;
    }
    return altText ? escapeHtml(String(altText)) : "";
  };

  markdownIt.renderer.rules.html_block = (tokens, index) => {
    const content = tokens[index]?.content ?? "";
    return escapeHtml(content);
  };

  markdownIt.renderer.rules.html_inline = (tokens, index) => {
    const content = tokens[index]?.content ?? "";
    return escapeHtml(content);
  };

  return markdownIt;
}

function renderCodeBlock(content: string, language: string): string {
  const normalized = content.replace(/\r\n?/g, "\n");
  const trimmedLanguage = language.trim();

  if (trimmedLanguage) {
    try {
      const result = hljs.highlight(normalized, { language: trimmedLanguage });
      return `<pre><code class="language-${escapeHtml(trimmedLanguage)}">${result.value}</code></pre>`;
    } catch {
      // Fall back to escaped plain text when highlight.js cannot resolve the language.
    }
  }

  try {
    const result = hljs.highlight(normalized, { language: "plaintext" });
    return `<pre><code>${result.value}</code></pre>`;
  } catch {
    return `<pre><code>${escapeHtml(normalized)}</code></pre>`;
  }
}

type ParsedSegment =
  | { type: "text"; tokens: Token[]; environment: Record<string, unknown> }
  | { type: "columns"; columns: ParsedSegment[][] };

function parseSegments(markdown: string, renderer: MarkdownIt): ParsedSegment[] {
  return parseMarkdownSegments(markdown)
    .map((segment) => {
      if (segment.type === "columns") {
        return { type: "columns", columns: segment.content.map((body) => parseSegments(body, renderer)) };
      }

      const environment = {};
      return { type: "text", tokens: renderer.parse(segment.content, environment), environment };
    });
}

function renderSegments(segments: ParsedSegment[], renderer: MarkdownIt): string {
  return segments.map((segment) => {
    if (segment.type === "columns") {
      const columns = segment.columns
        .map((column) => `<div class="column">${renderSegments(column, renderer)}</div>`)
        .join("");
      return `<div class="columns">${columns}</div>`;
    }
    return renderer.renderer.render(segment.tokens, renderer.options, segment.environment);
  })
    .join("");
}

function* imageTokens(tokens: Token[]): Generator<Token> {
  for (const token of tokens) {
    if (token.type === "image") {
      yield token;
    } else if (token.children) {
      yield* imageTokens(token.children);
    }
  }
}

async function resolveImages(
  segments: ParsedSegment[],
  resolveImage: (source: string) => Promise<string>,
): Promise<void> {
  for (const segment of segments) {
    if (segment.type === "columns") {
      for (const column of segment.columns) {
        await resolveImages(column, resolveImage);
      }
    } else {
      for (const token of imageTokens(segment.tokens)) {
        const source = token.attrGet("src");
        if (source) {
          token.attrSet("src", await resolveImage(source));
        }
      }
    }
  }
}

export function renderMarkdown(
  markdown: string,
  resolveImage?: (source: string) => string,
  resolveWikiImage?: (source: string) => string,
): string {
  const renderer = createMarkdownRenderer(resolveImage, resolveWikiImage);
  return renderSegments(parseSegments(markdown, renderer), renderer);
}

export async function renderMarkdownAsync(
  markdown: string,
  resolveImage: (source: string) => Promise<string>,
  resolveWikiImage?: (source: string) => string,
): Promise<string> {
  const renderer = createMarkdownRenderer(undefined, resolveWikiImage);
  const segments = parseSegments(markdown, renderer);
  await resolveImages(segments, resolveImage);
  return renderSegments(segments, renderer);
}
