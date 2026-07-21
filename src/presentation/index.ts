import { readFileSync } from "node:fs";
import { renderTemplate, type TemplateStep } from "../pipeline/template.js";
import { engineeringLiveReloadScript } from "./livereload.js";
import { engineeringTokensCss } from "./tokens.css.js";
import {
  engineeringNavigationScript,
  engineeringProgressMarkup,
  engineeringToggleMarkup,
  engineeringToggleScript,
} from "./toggle.js";

export interface PresentationSlide {
  readonly id: string;
  readonly title: string;
  readonly content: string;
}

export interface PresentationOptions {
  readonly documentTitle: string;
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

function createOverviewStep(placements: readonly SlidePlacement[], content: string): TemplateStep {
  const xValues = placements.map((placement) => placement.x);
  const yValues = placements.map((placement) => placement.y);
  const minX = placements.length > 0 ? Math.min(...xValues) : 0;
  const maxX = placements.length > 0 ? Math.max(...xValues) : 0;
  const minY = placements.length > 0 ? Math.min(...yValues) : 0;
  const maxY = placements.length > 0 ? Math.max(...yValues) : 0;
  const scale = Math.max(1, (maxX - minX + 1200) / 1024, (maxY - minY + 800) / 768);

  return {
    id: "overview",
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: 0,
    scale: Number(scale.toFixed(4)),
    content,
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
        <h1>${escapeHtml(options.documentTitle)}</h1>
      </div>
      ${buildSignature(options.version, options.repositoryUrl)}
  `;
  const steps: TemplateStep[] = [
    createOverviewStep(placements, overviewContent),
    ...slides.map((slide, index) => ({
      id: slide.id,
      x: placements[index].x,
      y: placements[index].y,
      z: 0,
      content: `
        <div class="engineering-card" data-theme="dark">
          <h2>${escapeHtml(slide.title)}</h2>
          <div class="engineering-card__content" data-slide-content>${slide.content}</div>
        </div>
      `,
    })),
  ];
  const liveReloadBlock = options.liveReload ? engineeringLiveReloadScript : "";
  const scenery = `${engineeringToggleMarkup()}${engineeringProgressMarkup()}${liveReloadBlock}${engineeringToggleScript}${engineeringNavigationScript}`;

  return renderTemplate({
    title: options.documentTitle,
    bodyClass: "engineering-theme",
    viewport: "width=device-width, initial-scale=1",
    css: engineeringTokensCss,
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
