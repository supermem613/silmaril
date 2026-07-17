import type { Theme, ThemeLayoutPlacement, ThemeRegionDescriptor } from '../contract.js';
import { createAtlasWorldSvg } from './world.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const placements: Readonly<Record<string, ThemeLayoutPlacement>> = {
  overview: {
    id: 'overview',
    title: 'The whole map',
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
    rotate: 0,
  },
  north: {
    id: 'north',
    title: 'Northern route',
    x: 1600,
    y: -900,
    z: 0,
    scale: 1,
    rotate: 0,
  },
  south: {
    id: 'south',
    title: 'Southern route',
    x: 1600,
    y: 900,
    z: 0,
    scale: 1,
    rotate: 0,
  },
};

function createPlacement(region: ThemeRegionDescriptor, index: number): ThemeLayoutPlacement {
  const placement = placements[region.id] ?? {
    id: region.id,
    title: region.title,
    x: index * 1400,
    y: 0,
    z: 0,
    scale: 1,
    rotate: 0,
  };
  return placement;
}

function getPinPosition(regionId: string): { x: number; y: number } {
  const placement = placements[regionId];
  if (placement) {
    return {
      x: 160 + (placement.x % 2400) / 8,
      y: 110 + ((placement.y % 1800) + 1800) / 12,
    };
  }
  return { x: 240, y: 180 };
}

export function atlasTheme(): Theme {
  return {
    name: 'atlas',
    backgroundColor: '#04131d',
    accentColor: '#f59e0b',
    globalCss: `:root { color-scheme: dark; }
body { margin: 0; min-height: 100vh; background: linear-gradient(180deg, #07111d 0%, #0c1f2f 100%); color: #e8f2ff; font-family: "Trebuchet MS", "Segoe UI", sans-serif; }
#impress { min-height: 100vh; padding: 2rem; box-sizing: border-box; }
.step { display: flex; flex-direction: column; gap: 0.75rem; min-width: 24rem; max-width: 32rem; padding: 0; border: 0; background: transparent; }
.step.overview { min-width: 0; min-height: 0; }`,
    sceneryCss: `.atlas-scene { display: grid; gap: 0.85rem; padding: 1rem; border-radius: 1.25rem; background: rgba(8, 19, 31, 0.95); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.12); }
.atlas-world { width: 100%; height: auto; display: block; border-radius: 1rem; }
.atlas-pin { position: absolute; width: 0.95rem; height: 0.95rem; border-radius: 999px; background: #f59e0b; box-shadow: 0 0 0 0.4rem rgba(245, 158, 11, 0.25); transform: translate(-50%, -50%); }
.atlas-label { padding: 0.4rem 0.7rem; border-radius: 999px; background: rgba(4, 19, 31, 0.95); color: #f8fafc; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-size: 0.72rem; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25); display: inline-flex; align-self: flex-start; }
.atlas-card { display: grid; gap: 0.4rem; padding: 0.35rem 0.1rem 0; }
.atlas-card .region-title { margin: 0; font-size: 1.15rem; font-weight: 700; color: #fef3c7; }
.atlas-card .region-content { margin: 0; line-height: 1.45; color: #dbeafe; font-size: 0.95rem; }`,
    regionCss: `.step .region-title { margin: 0; font-size: 1.1rem; font-weight: 700; color: #fef3c7; }
.step .region-content { margin: 0; line-height: 1.5; color: #dbeafe; }`,
    layout(regions) {
      return regions.map((region, index) => createPlacement(region, index));
    },
    renderRegion(region) {
      const pin = getPinPosition(region.id);
      const world = createAtlasWorldSvg({ pinX: pin.x, pinY: pin.y, title: region.title });
      return `<div class="atlas-scene"><div style="position: relative;">${world}<div class="atlas-pin" style="left: ${pin.x}px; top: ${pin.y}px;"></div></div><div class="atlas-label">${escapeHtml(region.title)}</div><div class="atlas-card"><h2 class="region-title">${escapeHtml(region.title)}</h2><div class="region-content">${region.content}</div></div></div>`;
    },
  };
}
