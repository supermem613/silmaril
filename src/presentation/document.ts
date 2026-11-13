import { engineeringLiveReloadScript } from "./livereload.js";
import { engineeringDocumentCss } from "./document.css.js";
import {
  engineeringSubtitleCss,
  engineeringTokensCss,
} from "./tokens.css.js";

export interface DocumentSection {
  readonly id: string;
  readonly title: string;
  readonly kind?: "content" | "section";
  readonly content?: string;
  readonly subtitle?: string;
}

export interface DocumentOptions {
  readonly documentTitle: string;
  readonly documentSubtitle?: string;
  readonly documentFooter?: {
    readonly left?: string;
    readonly right?: string;
  };
  readonly version?: string;
  readonly repositoryUrl?: string;
  readonly liveReload?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeSubtitle(value: string): string {
  return escapeHtml(value).replace(/\r\n?|\n/g, "<br>");
}

function buildSignature(version: string | undefined, repositoryUrl: string | undefined): string {
  if (!version) {
    return "";
  }
  const name = repositoryUrl
    ? `<a href="${escapeHtml(repositoryUrl)}" target="_blank" rel="noreferrer">silmaril</a>`
    : "silmaril";
  return `<div class="engineering-document__signature">${name} · ${escapeHtml(version)}</div>`;
}

function buildFooterMarkup(footer: DocumentOptions["documentFooter"]): string {
  if (!footer) {
    return "";
  }
  const left = footer.left
    ? `<div class="engineering-document__footer--left">${footer.left}</div>`
    : "";
  const right = footer.right
    ? `<div class="engineering-document__footer--right">${footer.right}</div>`
    : "";
  return `
      <footer class="engineering-document__footer">
        ${left}${right}
      </footer>`;
}

export function buildDocument(
  sections: readonly DocumentSection[],
  options: DocumentOptions,
): string {
  const sectionMarkup = sections
    .map((section) => {
      if (section.kind === "section") {
        return `
        <section id="${escapeHtml(section.id)}" class="engineering-document__section engineering-document__section--section" data-theme="dark" data-slide-id="${escapeHtml(section.id)}">
          <h2>${escapeHtml(section.title)}</h2>${section.subtitle ? `
          <p class="engineering-document__section-subtitle">${escapeSubtitle(section.subtitle)}</p>` : ""}
        </section>`;
      }
      return `
        <section id="${escapeHtml(section.id)}" class="engineering-document__section" data-theme="dark" data-slide-id="${escapeHtml(section.id)}">
          <h2>${escapeHtml(section.title)}</h2>
          <div class="engineering-card__content" data-slide-content>${section.content ?? ""}</div>
        </section>`;
    })
    .join("\n");

  const footerMarkup = buildFooterMarkup(options.documentFooter);
  const liveReloadBlock = options.liveReload ? engineeringLiveReloadScript : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.documentTitle)}</title>
    <style>
${engineeringTokensCss
  + (options.documentSubtitle ? engineeringSubtitleCss : "")
  + engineeringDocumentCss}
    </style>
  </head>
  <body class="engineering-document">
${buildSignature(options.version, options.repositoryUrl)}
    <main class="engineering-document__page" data-silmaril-document>
      <header class="engineering-document__header">
        <h1>${escapeHtml(options.documentTitle)}</h1>${options.documentSubtitle ? `
        <p class="engineering-board-subtitle">${escapeSubtitle(options.documentSubtitle)}</p>` : ""}
      </header>
      <div class="engineering-document__sections">
${sectionMarkup}
      </div>
${footerMarkup}
    </main>
${liveReloadBlock}
  </body>
</html>
`;
}
