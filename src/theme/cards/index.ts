import type { Theme, ThemeLayoutPlacement, ThemeRegionDescriptor } from '../contract.js';
import { cardsGlobalCss, cardsRegionCss, cardsSceneryCss } from './style.css.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createPlacement(region: ThemeRegionDescriptor, index: number): ThemeLayoutPlacement {
  const column = index % 2;
  const row = Math.floor(index / 2);
  return {
    id: region.id,
    title: region.title,
    x: column * 1400,
    y: row * 900,
    z: 0,
    scale: 1,
    rotate: 0,
  };
}

export function cardsTheme(): Theme {
  return {
    name: 'cards',
    backgroundColor: '#020617',
    accentColor: '#fb923c',
    globalCss: cardsGlobalCss,
    sceneryCss: cardsSceneryCss,
    regionCss: cardsRegionCss,
    layout(regions) {
      return regions.map((region, index) => createPlacement(region, index));
    },
    renderRegion(region) {
      return `<div class="region-panel"><h2 class="region-title">${escapeHtml(region.title)}</h2><div class="region-content">${region.content}</div></div>`;
    },
  };
}
