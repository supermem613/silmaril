import type { Theme, ThemeLayoutPlacement, ThemeRegionDescriptor } from '../contract.js';
import { sketchBoardCss, sketchBoardMarkup } from './board.js';

const placements: Readonly<Record<string, ThemeLayoutPlacement>> = {
  cover: { id: 'cover', title: 'Cover', x: 0, y: 0, z: 0, scale: 4.6, rotate: 0 },
  itch: { id: 'itch', title: 'The itch', x: -1440, y: -645, z: 0, scale: 1.4, rotate: 0 },
  map: { id: 'map', title: 'The map', x: -30, y: -770, z: 0, scale: 1.28, rotate: 0 },
  md: { id: 'md', title: 'Markdown', x: 1415, y: -645, z: 0, scale: 1.42, rotate: 0 },
  pipe: { id: 'pipe', title: 'Pipeline', x: -1120, y: 655, z: 0, scale: 1.55, rotate: 0 },
  'pipe-detail': { id: 'pipe-detail', title: 'Pipeline detail', x: -1110, y: 978, z: 0, scale: 0.62, rotate: 0 },
  look: { id: 'look', title: 'The look', x: 330, y: 360, z: 0, scale: 1.32, rotate: 0 },
  road: { id: 'road', title: 'Roadmap', x: 1470, y: 655, z: 0, scale: 1.55, rotate: 0 },
  finis: { id: 'finis', title: 'Finis', x: 0, y: 0, z: 0, scale: 4.6, rotate: 0 },
};
const acceptedRoutes = [
  { id: 'cover', title: 'Cover' },
  { id: 'itch', title: 'Itch' },
  { id: 'map', title: 'Map' },
  { id: 'md', title: 'Md' },
  { id: 'pipe', title: 'Pipe' },
  { id: 'pipe-detail', title: 'Pipe Detail' },
  { id: 'look', title: 'Look' },
  { id: 'road', title: 'Road' },
  { id: 'finis', title: 'Finis' },
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createPlacement(region: ThemeRegionDescriptor, index: number): ThemeLayoutPlacement {
  const fallback = index === 0
    ? { x: 0, y: 0, z: 0, scale: 1, rotate: 0 }
    : index === 1
      ? { x: 1100, y: 700, z: 160, scale: 1.04, rotate: -5 }
      : { x: 2200, y: 1400, z: 320, scale: 1.01, rotate: 4 };
  return placements[region.id] ?? {
    id: region.id,
    title: region.title,
    ...fallback,
  };
}

export function sketchTheme(): Theme {
  let rendersAcceptedBoard = false;

  return {
    name: 'sketch',
    title: 'Zoomable Sketch Board',
    backgroundColor: '#f4ecd8',
    accentColor: '#d85828',
    bodyClass: 'impress-not-supported',
    viewport: 'width=1024, minimum-scale=1, maximum-scale=1, user-scalable=no',
    fallbackHtml: '<div class="fallback-message"><b>This browser lacks CSS 3D transforms.</b> Open in a recent Edge, Chrome, or Firefox.</div>',
    hintHtml: '<div class="hint"><b>Space</b>/&rarr; next &middot; <b>&larr;</b> back &middot; <b>Tab</b> whole board &middot; <b>F</b> fullscreen</div>',
    impressAttributes: {
      'transition-duration': 1100,
      width: 1024,
      height: 768,
    },
    globalCss: sketchBoardCss,
    scenery: sketchBoardMarkup,
    wrapRegion: false,
    overview: false,
    layout(regions) {
      rendersAcceptedBoard = regions.length === acceptedRoutes.length
        && regions.every((region, index) => (
          region.id === acceptedRoutes[index]?.id
          && region.title === acceptedRoutes[index]?.title
          && region.content.trim().length === 0
        ));
      return regions.map((region, index) => createPlacement(region, index));
    },
    stepClassName(region) {
      if (region.id === 'cover') {
        return 'overview';
      }
      return region.id === 'finis' ? undefined : 'loc';
    },
    renderRegion(region) {
      if (rendersAcceptedBoard && placements[region.id]) {
        return '';
      }
      return `<div style="width:640px;min-height:320px;padding:34px 40px;box-sizing:border-box;background:#fffaf0;border:3px solid #2b2620;box-shadow:8px 8px 0 rgba(43,38,32,.22);font-family:Kalam,cursive;color:#2b2620"><h2 style="font-size:48px;margin:0 0 18px">${escapeHtml(region.title)}</h2><div style="font-size:28px;line-height:1.4">${region.content}</div></div>`;
    },
  };
}
