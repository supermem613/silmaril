import type { Theme, ThemeLayoutPlacement, ThemeRegionDescriptor } from '../contract.js';
import { atlasWorldMarkup } from './world.js';

const placements: Readonly<Record<string, ThemeLayoutPlacement>> = {
  cover: { id: 'cover', title: 'One map. Ten stops.', x: 0, y: 0, z: 0, scale: 3.9, rotate: 0 },
  havens: { id: 'havens', title: 'The Grey Havens', x: -1420, y: -80, z: 0, scale: 0.62, rotate: 0 },
  shire: { id: 'shire', title: 'The Shire', x: -1020, y: -190, z: 0, scale: 0.6, rotate: 0 },
  bree: { id: 'bree', title: 'Bree', x: -650, y: -215, z: 0, scale: 0.55, rotate: 0 },
  rivendell: { id: 'rivendell', title: 'Rivendell', x: -220, y: -345, z: 0, scale: 0.6, rotate: 0 },
  misty: { id: 'misty', title: 'The Misty Mountains', x: -80, y: 35, z: 0, scale: 0.72, rotate: 0 },
  lorien: { id: 'lorien', title: 'Lothlorien', x: 155, y: 320, z: 0, scale: 0.58, rotate: 0 },
  isengard: { id: 'isengard', title: 'Isengard', x: -10, y: 485, z: 0, scale: 0.55, rotate: 0 },
  edoras: { id: 'edoras', title: 'Edoras', x: 285, y: 680, z: 0, scale: 0.6, rotate: 0 },
  gondor: { id: 'gondor', title: 'Minas Tirith', x: 630, y: 750, z: 0, scale: 0.66, rotate: 0 },
  doom: { id: 'doom', title: 'Mount Doom', x: 1150, y: 505, z: 0, scale: 0.7, rotate: 0 },
  finis: { id: 'finis', title: 'Finis', x: 0, y: 0, z: 0, scale: 3.9, rotate: 0 },
};

const atlasCss = `  html,body{height:100%;margin:0;background:#241d16;overflow:hidden}
  body{font-family:"Palatino Linotype","Book Antiqua",Georgia,serif;color:#2b2016;
    -webkit-font-smoothing:antialiased}
  .fallback-message{max-width:640px;margin:12% auto;padding:24px;border-radius:12px;
    background:#f4ecd8;line-height:1.5;font-size:20px;display:none}
  .impress-not-supported .fallback-message{display:block}

  /* the single shared world layer: the whole map lives here at map coords */
  #world{position:absolute;left:-1800px;top:-1200px;
    width:3600px;height:2400px;
    box-shadow:0 0 120px rgba(0,0,0,.6) inset, 0 30px 120px rgba(0,0,0,.5)}
  #world svg{width:100%;height:100%;display:block}

  .step{width:900px}
  .loc{width:520px}
  .step .card{
    background:rgba(244,236,216,.94);border:1px solid #b79b6a;border-radius:14px;
    padding:22px 26px 24px;box-shadow:0 20px 60px rgba(0,0,0,.45);
    transform:translateY(-190px);text-align:left}
  .card .idx{font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#8a6a3a}
  .card h2{font-size:40px;margin:6px 0 2px;color:#3a2c1c;letter-spacing:.01em}
  .card .sub{margin:0 0 12px;font-style:italic;color:#7a5f3c;font-size:20px}
  .card .tag{margin:0;font-size:22px;line-height:1.4;color:#2b2016}
  /* marker at the exact geographic point (screen centre of the step) */
  .pinpoint{position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;
    border-radius:50%;background:#7a2b1d;box-shadow:0 0 0 4px rgba(244,236,216,.9),0 0 24px 6px rgba(255,120,40,.5)}

  .loc{opacity:0;transition:opacity .6s ease .3s}
  .loc.active{opacity:1}

  #cover .card{transform:none;text-align:center;width:560px;padding:34px 40px}
  #cover h2{font-size:56px}
  #cover .tag{font-size:24px}

  .hint{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:30;
    font-family:Georgia,serif;font-size:13px;color:#e7d6b0;background:rgba(20,15,10,.72);
    border:1px solid #6f5a3c;padding:7px 15px;border-radius:999px}
  .hint kbd{color:#ffcf8a}`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createPlacement(region: ThemeRegionDescriptor, index: number): ThemeLayoutPlacement {
  return placements[region.id] ?? {
    id: region.id,
    title: region.title,
    x: index * 500,
    y: 0,
    z: 0,
    scale: 0.6,
    rotate: 0,
  };
}

function renderAtlasRegion(region: ThemeRegionDescriptor): string {
  if (!region.content.trim()) {
    return '';
  }

  if (!/<h2(?:\s[^>]*)?>/i.test(region.content)) {
    return `<div class="card"><h2>${escapeHtml(region.title)}</h2><div class="tag">${region.content}</div></div><div class="pinpoint"></div>`;
  }

  const content = region.content
    .replace(/<em><strong><code>([\s\S]*?)<\/code><\/strong><\/em>/g, '<kbd>$1</kbd>')
    .replace(/<blockquote>\s*<p>([\s\S]*?)<\/p>\s*<\/blockquote>/g, '<p class="sub">$1</p>')
    .replace(/^\s*<p>([\s\S]*?)<\/p>/, '<span class="idx">$1</span>')
    .replace(/<p>([\s\S]*?)<\/p>/g, '<p class="tag">$1</p>');

  return `<div class="card">${content}</div>${region.id === 'cover' ? '' : '<div class="pinpoint"></div>'}`;
}

export function atlasTheme(): Theme {
  return {
    name: 'atlas',
    title: 'A Journey Across the Map',
    backgroundColor: '#241d16',
    accentColor: '#7a2b1d',
    bodyClass: 'impress-not-supported',
    viewport: 'width=1024, minimum-scale=1, maximum-scale=1, user-scalable=no',
    fallbackHtml: '<div class="fallback-message"><p><strong>This browser lacks CSS 3D transforms.</strong> Open in a recent Edge, Chrome, or Firefox.</p></div>',
    hintHtml: '<div class="hint"><kbd>Space</kbd>/<kbd>&rarr;</kbd> next &middot; <kbd>&larr;</kbd> back &middot; <kbd>Tab</kbd> map &middot; <kbd>F</kbd> fullscreen</div>',
    impressAttributes: {
      'transition-duration': 1100,
      width: 1024,
      height: 768,
    },
    globalCss: atlasCss,
    scenery: atlasWorldMarkup,
    wrapRegion: false,
    overview: false,
    layout(regions) {
      return regions.map((region, index) => createPlacement(region, index));
    },
    stepClassName(region) {
      if (region.id === 'cover') {
        return 'overview';
      }
      return region.id === 'finis' ? undefined : 'loc';
    },
    renderRegion(region) {
      return renderAtlasRegion(region);
    },
  };
}
