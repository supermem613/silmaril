export interface AtlasWorldSvgOptions {
  readonly pinX: number;
  readonly pinY: number;
  readonly title: string;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createAtlasWorldSvg(options: AtlasWorldSvgOptions): string {
  const random = mulberry32(0x4f1d4a2f);
  const scatter = Array.from({ length: 12 }, (_, index) => {
    const x = 110 + random() * 740;
    const y = 80 + random() * 420;
    const size = 3 + Math.round(random() * 5);
    const hue = index % 2 === 0 ? 'rgba(242, 170, 71, 0.7)' : 'rgba(147, 197, 253, 0.65)';
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${size}" fill="${hue}" />`;
  }).join('');

  return `<svg class="atlas-world" viewBox="0 0 960 560" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(options.title)}">
  <rect x="0" y="0" width="960" height="560" rx="28" fill="#07111d" />
  <path d="M40 420C130 350 170 325 240 290C325 247 340 215 410 178C470 145 520 128 590 150C680 180 710 255 768 292C814 323 872 338 924 328L924 520L40 520Z" fill="#1f4e35" />
  <path d="M120 475C220 440 281 390 354 350C434 304 506 280 585 250C635 232 683 230 748 248C808 264 866 292 924 328L924 520L120 520Z" fill="#346b4b" />
  <path d="M95 182C160 130 202 115 250 121C300 127 345 150 390 174C440 199 495 220 554 214C620 208 686 160 735 144C783 129 820 140 870 172" stroke="#7ed0b5" stroke-width="10" fill="none" stroke-linecap="round" />
  <path d="M118 430C188 398 239 370 290 342C340 315 392 293 445 290C508 286 560 320 612 343C664 367 715 383 780 382" stroke="#b7d6ff" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.8" />
  <circle cx="182" cy="174" r="38" fill="#d8d7a8" />
  <circle cx="734" cy="140" r="44" fill="#e7f1d2" />
  <circle cx="356" cy="228" r="21" fill="#d8d7a8" />
  <path d="M694 182L718 140L732 178Z" fill="#6d4f36" />
  <path d="M390 392L408 332L446 356Z" fill="#6d4f36" />
  <path d="M610 210C627 197 651 188 674 188C698 188 724 201 730 226" stroke="#5e8a68" stroke-width="8" fill="none" stroke-linecap="round" />
  <g fill="#e5f3ff" opacity="0.8">${scatter}</g>
  <circle cx="${options.pinX.toFixed(2)}" cy="${options.pinY.toFixed(2)}" r="15" fill="#fb923c" />
  <circle cx="${options.pinX.toFixed(2)}" cy="${options.pinY.toFixed(2)}" r="26" fill="none" stroke="#fde68a" stroke-width="6" opacity="0.8" />
</svg>`;
}
