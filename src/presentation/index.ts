import { readFileSync } from "node:fs";
import { renderTemplate, type TemplateStep } from "../pipeline/template.js";
import { engineeringFitScript } from "./fit.js";
import { engineeringLiveReloadScript } from "./livereload.js";
import { engineeringFooterCss, engineeringSubtitleCss, engineeringTokensCss } from "./tokens.css.js";
import {
  engineeringNavigationScript,
  engineeringProgressMarkup,
  engineeringToggleMarkup,
  engineeringToggleScript,
} from "./toggle.js";

export interface PresentationSlide {
  readonly id: string;
  readonly title: string;
  readonly kind?: "content" | "section";
  readonly content?: string;
  readonly subtitle?: string;
}

export interface PresentationOptions {
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

interface SlidePlacement {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

const OVERVIEW_STYLE = "width:1024px;height:768px;padding:0;background:transparent;border:0;box-shadow:none;pointer-events:none";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSignature(version: string | undefined, repositoryUrl: string | undefined): string {
  if (!version) {
    return "";
  }
  const name = repositoryUrl
    ? `<a href="${escapeHtml(repositoryUrl)}" target="_blank" rel="noreferrer">silmaril</a>`
    : "silmaril";
  return `<div class="engineering-board-signature">${name} · ${escapeHtml(version)}</div>`;
}

function buildFooterMarkup(footer: PresentationOptions["documentFooter"]): string {
  if (!footer) {
    return "";
  }
  const left = footer.left
    ? `<div class="engineering-footer engineering-footer--left">${footer.left}</div>`
    : "";
  const right = footer.right
    ? `<div class="engineering-footer engineering-footer--right">${footer.right}</div>`
    : "";
  return `${left}${right}`;
}

function escapeSubtitle(value: string): string {
  return escapeHtml(value).replace(/\r\n?|\n/g, "<br>");
}

function layoutSlides(slides: readonly PresentationSlide[]): SlidePlacement[] {
  const columns = Math.min(Math.max(slides.length, 1), 5);
  return slides.map((slide, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const slidesInRow = Math.min(columns, slides.length - row * columns);
    const rowOffset = ((columns - slidesInRow) * 1200) / 2;
    return {
      id: slide.id,
      x: rowOffset + column * 1200,
      y: row * 900,
    };
  });
}

function subtitleLayoutScript(boardHeight: number): string {
  // Measure wrapping before impress caches the overview transform. Focused
  // slides must keep their original camera positions and scales.
  return `<script>
    (function () {
      var overview = document.querySelector('.engineering-board-overview');
      var heading = overview.querySelector('.engineering-board-title');
      var scale = Number(overview.dataset.scale || 1);
      var reservedHeight = heading.offsetHeight + heading.offsetTop * 2;
      var fit = Math.min(1, overview.clientHeight / (reservedHeight + ${boardHeight} / scale));
      heading.style.transformOrigin = 'top left';
      heading.style.transform = 'scale(' + fit + ')';
      heading.style.top = (heading.offsetTop * fit) + 'px';
      overview.dataset.scale = String(scale / fit);
      overview.dataset.y = String(Number(overview.dataset.y) - reservedHeight * scale / 2);
    })();
  </script>`;
}

function createOverviewStep(placements: readonly SlidePlacement[], content: string, hasSubtitle: boolean): TemplateStep {
  const xValues = placements.map((placement) => placement.x);
  const yValues = placements.map((placement) => placement.y);
  const minX = placements.length > 0 ? Math.min(...xValues) : 0;
  const maxX = placements.length > 0 ? Math.max(...xValues) : 0;
  const minY = placements.length > 0 ? Math.min(...yValues) : 0;
  const maxY = placements.length > 0 ? Math.max(...yValues) : 0;
  const boardHeight = maxY - minY + 800;
  const scale = Math.max(1, (maxX - minX + 1200) / 1024, boardHeight / 768);

  return {
    id: "overview",
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: 0,
    scale: Number(scale.toFixed(4)),
    content: hasSubtitle ? content + subtitleLayoutScript(boardHeight) : content,
    className: "camera-overview engineering-board-overview",
    style: OVERVIEW_STYLE,
  };
}

export function buildPresentation(
  slides: readonly PresentationSlide[],
  options: PresentationOptions,
): string {
  const placements = layoutSlides(slides);
  const overviewContent = `
      <div class="engineering-board-title">
        <h1>${escapeHtml(options.documentTitle)}</h1>${options.documentSubtitle ? `
        <p class="engineering-board-subtitle">${escapeSubtitle(options.documentSubtitle)}</p>` : ""}
      </div>
      ${buildSignature(options.version, options.repositoryUrl)}
  `;
  const steps: TemplateStep[] = [
    createOverviewStep(placements, overviewContent, Boolean(options.documentSubtitle)),
    ...slides.map((slide, index) => ({
      id: slide.id,
      x: placements[index].x,
      y: placements[index].y,
      z: 0,
      content: slide.kind === "section" ? `
        <div class="engineering-section" data-theme="dark">
          <h2>${escapeHtml(slide.title)}</h2>${slide.subtitle ? `
          <p class="engineering-section__subtitle">${escapeSubtitle(slide.subtitle)}</p>` : ""}
        </div>
      ` : `
        <div class="engineering-card" data-theme="dark">
          <h2>${escapeHtml(slide.title)}</h2>
          <div class="engineering-card__content" data-slide-content>${slide.content ?? ""}</div>
        </div>
      `,
    })),
  ];
  const liveReloadBlock = options.liveReload ? engineeringLiveReloadScript : "";
  const footerMarkup = buildFooterMarkup(options.documentFooter);
  const scenery = `${footerMarkup}${engineeringToggleMarkup()}${engineeringProgressMarkup()}${liveReloadBlock}${engineeringToggleScript}${engineeringNavigationScript}${engineeringFitScript}`;

  return renderTemplate({
    title: options.documentTitle,
    bodyClass: "engineering-theme",
    viewport: "width=device-width, initial-scale=1",
    css: engineeringTokensCss
      + (options.documentSubtitle ? engineeringSubtitleCss : "")
      + (options.documentFooter ? engineeringFooterCss : ""),
    scenery,
    impressAttributes: {
      width: 1120,
      height: 820,
      "max-scale": 2,
    },
    steps,
    impressScript: readFileSync(new URL("../../assets/vendor/impress.min.js", import.meta.url), "utf8"),
  });
}
