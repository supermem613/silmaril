import { readFileSync } from 'node:fs';
import type { Theme, ThemeLayoutPlacement, ThemeRegionDescriptor } from '../theme/contract.js';
import { renderTemplate, type TemplateStep } from './template.js';

export const SILMARIL_NOT_IMPLEMENTED_ASSEMBLE = 'SILMARIL_NOT_IMPLEMENTED_ASSEMBLE';

export interface Region {
  readonly id: string;
  readonly title: string;
  readonly content: string;
}

function getImpressScript(): string {
  return readFileSync(new URL('../../assets/vendor/impress.min.js', import.meta.url), 'utf8');
}

function toThemeRegion(region: Region): ThemeRegionDescriptor {
  return {
    id: region.id,
    title: region.title,
    content: region.content,
  };
}

function defaultLayout(regions: readonly ThemeRegionDescriptor[]): readonly ThemeLayoutPlacement[] {
  return regions.map((region, index) => ({
    id: region.id,
    title: region.title,
    x: index * 1000,
    y: 0,
    z: 0,
    scale: 1,
    rotate: 0,
  }));
}

function resolveLayout(theme: Theme, regions: readonly ThemeRegionDescriptor[]): readonly ThemeLayoutPlacement[] {
  if (typeof theme.layout === 'function') {
    const placements = theme.layout(regions, { theme });
    if (Array.isArray(placements)) {
      const lookup = new Map(placements.map((placement) => [placement.id, placement]));
      return regions.map((region, index) => {
        const placement = lookup.get(region.id);
        return {
          id: region.id,
          title: region.title,
          x: placement?.x ?? index * 1000,
          y: placement?.y ?? 0,
          z: placement?.z ?? 0,
          scale: placement?.scale ?? 1,
          rotate: placement?.rotate ?? 0,
        };
      });
    }
  }

  return defaultLayout(regions);
}

function renderRegionContent(theme: Theme, region: ThemeRegionDescriptor): string {
  if (typeof theme.renderRegion === 'function') {
    return theme.renderRegion(region, { theme });
  }

  return `<p class="region-content">${region.content}</p>`;
}

function createStep(theme: Theme, region: ThemeRegionDescriptor, placement: ThemeLayoutPlacement): TemplateStep {
  return {
    id: placement.id,
    title: placement.title,
    x: placement.x,
    y: placement.y,
    z: placement.z ?? 0,
    scale: placement.scale,
    rotate: placement.rotate,
    content: `<div class="step-card">${renderRegionContent(theme, region)}</div>`,
  };
}

export function assemble(theme: Theme, regions: readonly Region[]): string {
  const descriptors = regions.map(toThemeRegion);
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
  const steps = descriptors.map((region, index) => createStep(theme, region, placements[index] ?? {
    id: region.id,
    title: region.title,
    x: index * 1000,
    y: 0,
    z: 0,
    scale: 1,
    rotate: 0,
  }));

  steps.push({
    id: 'overview',
    title: 'Overview',
    x: 0,
    y: 0,
    z: 0,
    scale: 4,
    content: '',
    overview: true,
  });

  return renderTemplate({
    title: 'Zoomable Canvas',
    theme,
    steps,
    impressScript: getImpressScript(),
  });
}
