import { readFileSync } from 'node:fs';
import type { ThemeAsset } from '../contract.js';

const kalamFontBase64 = readFileSync(new URL('../../../assets/fonts/kalam.woff2.base64.txt', import.meta.url), 'utf8').trim();
const sketchFontCss = `@font-face { font-family: "SketchFont"; src: url(data:font/woff2;base64,${kalamFontBase64}); }`;

export function getSketchFontAsset(): ThemeAsset {
  return {
    name: 'sketch-font',
    content: sketchFontCss,
    mimeType: 'text/css',
    type: 'css',
  };
}
