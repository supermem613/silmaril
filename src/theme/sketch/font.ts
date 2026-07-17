import { readFileSync } from 'node:fs';
import type { ThemeAsset } from '../contract.js';

export function getSketchFontAsset(): ThemeAsset {
  const kalamFontBase64 = readFileSync(new URL('../../../assets/fonts/kalam.woff2.base64.txt', import.meta.url), 'utf8').trim();

  return {
    name: 'sketch-font',
    content: `@font-face { font-family: "SketchFont"; src: url(data:font/woff2;base64,${kalamFontBase64}); }`,
    mimeType: 'text/css',
    type: 'css',
  };
}
