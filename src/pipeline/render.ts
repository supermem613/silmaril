import MarkdownIt from "markdown-it";
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

function createMarkdownRenderer(): MarkdownIt {
  const markdownIt = new MarkdownIt(DEFAULT_RENDERER_OPTIONS);

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
    const source = typeof token?.attrGet === "function" ? token.attrGet("src") : "";
    if (source && /^data:image\/(?:png|jpeg|gif|svg\+xml|webp|avif);base64,[a-z\d+/=]+$/i.test(source)) {
      return `<img src="${escapeHtml(source)}" alt="${escapeHtml(String(altText))}">`;
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

function renderSegments(markdown: string, renderer: MarkdownIt): string {
  return parseMarkdownSegments(markdown)
    .map((segment) => {
      if (segment.type === "columns") {
        const columns = segment.content
          .map((columnBody) => `<div class="column">${renderSegments(columnBody, renderer)}</div>`)
          .join("");
        return `<div class="columns">${columns}</div>`;
      }

      return renderer.render(segment.content);
    })
    .join("");
}

export function renderMarkdown(markdown: string): string {
  return renderSegments(markdown, createMarkdownRenderer());
}
