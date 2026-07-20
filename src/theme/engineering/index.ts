import type { Theme, ThemeRegionDescriptor } from '../contract.js';
import { engineeringTokensCss } from './tokens.css.js';
import { engineeringNavigationScript, engineeringToggleMarkup, engineeringToggleScript } from './toggle.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function engineeringTheme(): Theme {
  return {
    name: 'engineering',
    title: 'Engineering Board',
    backgroundColor: '#0B0D0E',
    accentColor: '#67D3C2',
    bodyClass: 'engineering-theme',
    viewport: 'width=device-width, initial-scale=1',
    globalCss: engineeringTokensCss,
    scenery: () => `${engineeringToggleMarkup()}${engineeringToggleScript}${engineeringNavigationScript}`,
    renderOverview: ({ documentTitle }) => `
      <div class="engineering-board-title">
        <h1>${escapeHtml(documentTitle)}</h1>
      </div>
    `,
    impressAttributes: {
      width: 1024,
      height: 768,
      'max-scale': 2,
    },
    overview: 'auto',
    layout: (regions) => regions.map((region, index) => ({
      id: region.id,
      title: region.title,
      x: index * 1200,
      y: 0,
      z: 0,
      scale: 1,
      rotate: 0,
    })),
    wrapRegion: false,
    renderRegion(region: ThemeRegionDescriptor) {
      return `
        <div class="engineering-card" data-theme="dark">
          <h2>${escapeHtml(region.title)}</h2>
          ${region.content}
        </div>
      `;
    },
  };
}
