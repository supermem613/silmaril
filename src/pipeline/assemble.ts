import { readFileSync } from 'node:fs';
import type { Theme, ThemeLayoutPlacement, ThemeOverview, ThemePlacementPatch, ThemeRegionDescriptor } from '../theme/contract.js';
import { renderTemplate, type TemplateStep } from './template.js';

export const SILMARIL_NOT_IMPLEMENTED_ASSEMBLE = 'SILMARIL_NOT_IMPLEMENTED_ASSEMBLE';

export interface Region {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly markdownSource?: string;
  readonly x?: number;
  readonly y?: number;
  readonly scale?: number;
  readonly rotate?: number;
}

export interface AssembleOptions {
  readonly documentTitle?: string;
  readonly version?: string;
}

const CAMERA_OVERVIEW_STYLE = 'width:0;padding:0;background:transparent;border:0;border-radius:0;box-shadow:none;opacity:0;pointer-events:none';

function getImpressScript(): string {
  return readFileSync(new URL('../../assets/vendor/impress.min.js', import.meta.url), 'utf8');
}

function toThemeRegion(region: Region): ThemeRegionDescriptor {
  return {
    id: region.id,
    title: region.title,
    content: region.content,
    markdownSource: region.markdownSource,
    x: region.x,
    y: region.y,
    scale: region.scale,
    rotate: region.rotate,
  };
}

function buildSourcePayload(documentTitle: string, regions: readonly ThemeRegionDescriptor[]) {
  const slides = regions
    .map((region) => {
      if (typeof region.markdownSource === 'undefined') {
        return null;
      }

      return {
        id: region.id,
        title: region.title,
        markdown: region.markdownSource,
      };
    })
    .filter((slide): slide is { id: string; title: string; markdown: string } => slide !== null);

  if (slides.length === 0) {
    return undefined;
  }

  return {
    title: documentTitle,
    slides,
  };
}

function createFallbackPlacement(region: ThemeRegionDescriptor, index: number): ThemeLayoutPlacement {
  return {
    id: region.id,
    title: region.title,
    x: index * 1000,
    y: 0,
    z: 0,
    scale: 1,
    rotate: 0,
  };
}

function applyPlacementPatch(placement: ThemeLayoutPlacement, patch: ThemePlacementPatch): ThemeLayoutPlacement {
  return {
    ...placement,
    x: patch.x ?? placement.x,
    y: patch.y ?? placement.y,
    scale: patch.scale ?? placement.scale ?? 1,
    rotate: patch.rotate ?? placement.rotate ?? 0,
  };
}

function buildPlacement(region: ThemeRegionDescriptor, index: number, themePlacement?: ThemeLayoutPlacement): ThemeLayoutPlacement {
  const basePlacement = themePlacement ?? createFallbackPlacement(region, index);

  return applyPlacementPatch(basePlacement, {
    x: region.x,
    y: region.y,
    scale: region.scale,
    rotate: region.rotate,
  });
}

function resolveLayout(theme: Theme, regions: readonly ThemeRegionDescriptor[]): readonly ThemeLayoutPlacement[] {
  if (typeof theme.layout === 'function') {
    const placements = theme.layout(regions, { theme });
    if (Array.isArray(placements)) {
      const lookup = new Map(placements.map((placement) => [placement.id, placement]));
      return regions.map((region, index) => {
        const placement = lookup.get(region.id);
        return buildPlacement(region, index, placement);
      });
    }
  }

  return regions.map((region, index) => buildPlacement(region, index));
}

function renderRegionContent(theme: Theme, region: ThemeRegionDescriptor): string {
  if (typeof theme.renderRegion === 'function') {
    return theme.renderRegion(region, { theme });
  }

  return `<p class="region-content">${region.content}</p>`;
}

function createStep(theme: Theme, region: ThemeRegionDescriptor, placement: ThemeLayoutPlacement): TemplateStep {
  const rendered = renderRegionContent(theme, region);
  return {
    id: placement.id,
    title: placement.title,
    x: placement.x,
    y: placement.y,
    z: placement.z ?? 0,
    scale: placement.scale,
    rotate: placement.rotate,
    content: theme.wrapRegion === false ? rendered : `<div class="step-card">${rendered}</div>`,
    className: theme.stepClassName?.(region, { theme }),
  };
}

function createOverviewStep(
  overview: ThemeOverview | undefined,
  stepOverrides: Pick<TemplateStep, 'className' | 'style'> = {},
): TemplateStep {
  return {
    id: overview?.id ?? 'overview',
    title: overview?.title ?? 'Overview',
    x: overview?.x ?? 0,
    y: overview?.y ?? 0,
    z: overview?.z ?? 0,
    scale: overview?.scale ?? 4,
    rotate: overview?.rotate,
    content: overview?.content ?? '',
    overview: true,
    className: stepOverrides.className ?? overview?.className,
    style: stepOverrides.style,
  };
}

function createAutoOverviewStep(placements: readonly ThemeLayoutPlacement[]): TemplateStep {
  if (placements.length === 0) {
    return createOverviewStep(
      {
        x: 0,
        y: 0,
        scale: 1,
        content: '',
      },
      {
        className: 'camera-overview',
        style: CAMERA_OVERVIEW_STYLE,
      },
    );
  }

  const xValues = placements.map((placement) => placement.x);
  const yValues = placements.map((placement) => placement.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const scale = Math.max(
    1,
    (maxX - minX + 1200) / 1024,
    (maxY - minY + 800) / 768,
  );

  return createOverviewStep(
    {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      scale: Number(scale.toFixed(4)),
      content: '',
    },
    {
      className: 'camera-overview',
      style: CAMERA_OVERVIEW_STYLE,
    },
  );
}

export function assemble(theme: Theme, regions: readonly Region[], options: AssembleOptions = {}): string {
  const documentTitle = options.documentTitle ?? theme.title ?? 'Zoomable Canvas';
  const descriptors = regions.map(toThemeRegion);
  const sourcePayload = buildSourcePayload(documentTitle, descriptors);
  const validationErrors = theme.validate?.(theme, descriptors);
  if (Array.isArray(validationErrors)) {
    const issues = validationErrors.filter((message): message is string => typeof message === 'string' && message.trim().length > 0);
    if (issues.length > 0) {
      throw new Error(issues.join('; '));
    }
  } else if (typeof validationErrors === 'string' && validationErrors.trim().length > 0) {
    throw new Error(validationErrors);
  }

  const placements = resolveLayout(theme, descriptors);
  const steps = descriptors.map((region, index) => createStep(theme, region, placements[index] ?? createFallbackPlacement(region, index)));

  if (theme.overview === 'auto') {
    const overviewContent = theme.renderOverview?.({ theme, documentTitle, version: options.version, sourcePayload }) ?? '';
    const overviewStep = createAutoOverviewStep(placements);
    steps.unshift({
      ...overviewStep,
      content: overviewContent,
      className: overviewContent ? 'camera-overview engineering-board-overview' : overviewStep.className,
      style: overviewContent
        ? 'width:1024px;height:768px;padding:0;background:transparent;border:0;box-shadow:none;pointer-events:none'
        : overviewStep.style,
    });
  } else if (theme.overview !== false) {
    steps.push(createOverviewStep(theme.overview));
  }

  return renderTemplate({
    title: documentTitle,
    theme,
    steps,
    impressScript: getImpressScript(),
  });
}
