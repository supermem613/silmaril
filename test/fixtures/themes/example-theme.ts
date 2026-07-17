import type { Theme } from '../../../src/theme/contract.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const exampleTheme: Theme = {
  name: 'example-theme',
  backgroundColor: '#f8fafc',
  accentColor: '#0f172a',
  globalCss: `:root { color-scheme: light; }
body { margin: 0; min-height: 100vh; background: #f8fafc; color: #0f172a; font-family: system-ui, sans-serif; }
#impress { min-height: 100vh; padding: 2rem; box-sizing: border-box; }`,
  sceneryCss: `.example-scene { display: grid; gap: 0.75rem; padding: 1rem; border: 1px solid #cbd5e1; border-radius: 0.75rem; background: #ffffff; }`,
  regionCss: `.example-region { display: grid; gap: 0.35rem; }
.example-region .region-title { margin: 0; font-size: 1.05rem; font-weight: 700; }
.example-region .region-content { margin: 0; line-height: 1.5; }`,
  validate: () => null,
  renderRegion(region) {
    return `<div class="example-region"><h2 class="region-title">${escapeHtml(region.title)}</h2><div class="region-content">${region.content}</div></div>`;
  },
};
