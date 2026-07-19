import type { Theme, ThemeRegionDescriptor } from '../contract.js';
import { engineeringTokensCss } from './tokens.css.js';
import { engineeringToggleMarkup, engineeringToggleScript } from './toggle.js';

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
    scenery: `${engineeringToggleMarkup}${engineeringToggleScript}`,
    wrapRegion: false,
    renderRegion(region: ThemeRegionDescriptor) {
      return `
        <div class="engineering-card" data-theme="dark">
          <span class="engineering-card__eyebrow">Engineering</span>
          <h2>${escapeHtml(region.title)}</h2>
          ${region.content}
        </div>
      `;
    },
  };
}
