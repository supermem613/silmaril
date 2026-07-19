import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
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

  markdownIt.renderer.rules.link_open = () => "";
  markdownIt.renderer.rules.link_close = () => "";

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

export function renderRegion(markdown: string): string {
  return createMarkdownRenderer().render(markdown);
}
