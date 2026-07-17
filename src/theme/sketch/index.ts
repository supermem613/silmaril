import type { Theme, ThemeLayoutPlacement, ThemeRegionDescriptor } from '../contract.js';
import { getSketchFontAsset } from './font.js';
import { createSketchBox, createSketchCircle, createSketchDot, createSketchLine, resetSketchSeeds } from './rough.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createPlacement(region: ThemeRegionDescriptor, index: number): ThemeLayoutPlacement {
  let x = index * 1200;
  let y = 0;
  let z = 0;
  let scale = 1;
  let rotate = 0;

  if (index === 1) {
    x = 1100;
    y = 700;
    z = 160;
    scale = 1.04;
    rotate = -5;
  } else if (index >= 2) {
    x = 2200;
    y = 1400;
    z = 320;
    scale = 1.01;
    rotate = 4;
  }

  return {
    id: region.id,
    title: region.title,
    x,
    y,
    z,
    scale,
    rotate,
  };
}

function createDraftScene(): string {
  return `<svg viewBox="0 0 480 300" class="sketch-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Draft sketch scene">
  <rect x="12" y="12" width="456" height="276" rx="22" fill="#fff8e8" />
  ${createSketchBox(42, 58, 188, 124, '#1f2a44')}
  ${createSketchCircle(270, 90, 48, '#4f4d2d')}
  ${createSketchLine(140, 200, 310, 208, '#b44b22')}
  ${createSketchBox(120, 180, 112, 74, '#4b3b2d')}
  ${createSketchDot(340, 214, 7, '#5e3b24')}
  <text x="70" y="96" font-size="18" fill="#3d2f1d" font-family="SketchFont, cursive">cluster</text>
  <text x="242" y="96" font-size="18" fill="#3d2f1d" font-family="SketchFont, cursive">orbit</text>
  <text x="122" y="228" font-size="16" fill="#3d2f1d" font-family="SketchFont, cursive">note</text>
</svg>`;
}

function createDetailScene(): string {
  return `<svg viewBox="0 0 480 300" class="sketch-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Detail sketch scene">
  <rect x="14" y="12" width="452" height="276" rx="22" fill="#fdf2d5" />
  ${createSketchBox(44, 44, 160, 112, '#4c4f4b')}
  ${createSketchLine(240, 86, 348, 86, '#8b3d3d')}
  ${createSketchCircle(290, 162, 44, '#2c6a61')}
  ${createSketchLine(96, 208, 242, 208, '#7a5c2c')}
  ${createSketchBox(92, 172, 96, 72, '#2c3a20')}
  ${createSketchDot(314, 164, 6, '#6d3d2d')}
  <text x="68" y="102" font-size="18" fill="#3d2f1d" font-family="SketchFont, cursive">detail</text>
  <text x="278" y="150" font-size="18" fill="#3d2f1d" font-family="SketchFont, cursive">zoom</text>
  <text x="122" y="224" font-size="16" fill="#3d2f1d" font-family="SketchFont, cursive">focus</text>
</svg>`;
}

function createFinishScene(): string {
  return `<svg viewBox="0 0 480 300" class="sketch-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Finish sketch scene">
  <rect x="12" y="12" width="456" height="276" rx="22" fill="#f8efe0" />
  ${createSketchBox(44, 62, 172, 114, '#2b4a4d')}
  ${createSketchLine(252, 98, 336, 98, '#7c4a05')}
  ${createSketchCircle(370, 100, 38, '#245a3b')}
  ${createSketchBox(132, 194, 118, 58, '#2f2a1d')}
  ${createSketchDot(256, 210, 6, '#6a4c28')}
  ${createSketchLine(176, 220, 222, 220, '#6b4a3a')}
  <text x="74" y="112" font-size="18" fill="#3d2f1d" font-family="SketchFont, cursive">finish</text>
  <text x="334" y="106" font-size="18" fill="#3d2f1d" font-family="SketchFont, cursive">done</text>
  <text x="150" y="226" font-size="16" fill="#3d2f1d" font-family="SketchFont, cursive">close</text>
</svg>`;
}

function createScene(regionId: string): string {
  resetSketchSeeds();
  if (regionId === 'detail') {
    return createDetailScene();
  }
  if (regionId === 'finish') {
    return createFinishScene();
  }
  return createDraftScene();
}

export function sketchTheme(): Theme {
  return {
    name: 'sketch',
    backgroundColor: '#fdf7e6',
    accentColor: '#7c4a05',
    globalCss: `:root { color-scheme: light; }
body { margin: 0; min-height: 100vh; background: #fdf7e6; color: #2f241d; font-family: "SketchFont", "sketch-font", cursive; }
#impress { min-height: 100vh; padding: 2rem; box-sizing: border-box; }
.step { display: flex; flex-direction: column; gap: 0.85rem; min-width: 20rem; max-width: 32rem; padding: 0; border: 0; background: transparent; }
.step.overview { min-width: 0; min-height: 0; }
.step-card { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; border: 2px solid #2f241d; background: rgba(255, 249, 235, 0.96); box-shadow: 6px 6px 0 rgba(47, 36, 29, 0.2); border-radius: 1rem; }`,
    sceneryCss: `.sketch-scene { padding: 0.5rem; border: 2px dashed #a37b4e; border-radius: 0.9rem; background: linear-gradient(135deg, #fff8e8 0%, #f6e4bc 100%); }
.sketch-svg { width: 100%; height: auto; display: block; }
.sketch-caption { display: grid; gap: 0.35rem; }`,
    regionCss: `.step .region-title { margin: 0; font-size: 1.15rem; font-weight: 700; color: #2f241d; }
.step .region-content { margin: 0; line-height: 1.45; color: #4a3725; }`,
    assets: [getSketchFontAsset()],
    layout(regions) {
      return regions.map((region, index) => createPlacement(region, index));
    },
    renderRegion(region) {
      return `<div class="sketch-scene">${createScene(region.id)}</div><div class="sketch-caption"><h2 class="region-title">${escapeHtml(region.title)}</h2><div class="region-content">${region.content}</div></div>`;
    },
  };
}
