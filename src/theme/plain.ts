import { readFileSync } from 'node:fs';
import type { Theme } from './contract.js';

const kalamFontBase64 = readFileSync(new URL('../../assets/fonts/kalam.woff2.base64.txt', import.meta.url), 'utf8').trim();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function plainTheme(): Theme {
  return {
    name: 'plain',
    backgroundColor: '#ffffff',
    accentColor: '#111111',
    globalCss: `:root { color-scheme: light; }
body { margin: 0; min-height: 100vh; background: #ffffff; color: #111111; font-family: system-ui, sans-serif; }
#impress { min-height: 100vh; padding: 2rem; box-sizing: border-box; }`,
    sceneryCss: `.step { display: flex; flex-direction: column; gap: 0.75rem; min-width: 20rem; padding: 1.5rem; border: 1px solid #111111; background: #ffffff; box-shadow: 0 0 0 1px rgba(17, 17, 17, 0.1); }
.step.overview { min-width: 0; min-height: 0; border-style: dashed; }`,
    regionCss: `.step .region-title { margin: 0; font-size: 1.25rem; font-weight: 700; }
.step .region-content { margin: 0; line-height: 1.5; }`,
    assets: [
      {
        name: 'kalam-font',
        content: `@font-face { font-family: "Kalam"; src: url(data:font/woff2;base64,${kalamFontBase64}); }`,
        mimeType: 'text/css',
        type: 'css',
      },
    ],
    renderRegion(region) {
      return `<h2 class="region-title">${escapeHtml(region.title)}</h2><div class="region-content">${region.content}</div>`;
    },
  };
}
