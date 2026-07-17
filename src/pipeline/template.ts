import type { Theme, ThemeAsset } from '../theme/contract.js';

export interface TemplateStep {
  readonly id: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scale?: number;
  readonly rotate?: number;
  readonly content: string;
  readonly overview?: boolean;
}

export interface TemplateOptions {
  readonly title: string;
  readonly theme: Theme;
  readonly steps: readonly TemplateStep[];
  readonly impressScript: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAssets(assets: readonly ThemeAsset[] | undefined): string {
  if (!assets?.length) {
    return '';
  }

  return assets
    .map((asset) => asset.content)
    .filter((chunk) => chunk.length > 0)
    .join('\n');
}

export function renderTemplate(options: TemplateOptions): string {
  const styles = [options.theme.globalCss, options.theme.sceneryCss, options.theme.regionCss]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join('\n');

  const assetCss = formatAssets(options.theme.assets).trim();
  const styleBlock = [assetCss, styles].filter((value) => value.length > 0).join('\n');
  const stepMarkup = options.steps
    .map((step) => {
      const classNames = ['step', step.overview ? 'overview' : ''].filter(Boolean).join(' ');
      const attributes = [
        `data-x="${step.x}"`,
        `data-y="${step.y}"`,
        `data-z="${step.z}"`,
        `data-id="${escapeHtml(step.id)}"`,
      ];

      if (step.overview) {
        attributes.push(`data-scale="${step.scale ?? 4}"`);
      } else if (typeof step.scale === 'number' && step.scale !== 1) {
        attributes.push(`data-scale="${step.scale}"`);
      }

      if (typeof step.rotate === 'number' && step.rotate !== 0) {
        attributes.push(`data-rotate="${step.rotate}"`);
      }

      return `      <div class="${classNames}" ${attributes.join(' ')}>${step.content}</div>`;
    })
    .join('\n');

  const scripts = [
    '<script>window.impress = window.impress || {};</script>',
    `<script>${options.impressScript}</script>`,
    '<script>window.impress && window.impress.init && window.impress.init();</script>',
  ].join('\n');

  return `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>${escapeHtml(options.title)}</title>${styleBlock ? `\n    <style>\n${styleBlock}\n    </style>` : ''}\n  </head>\n  <body>\n    <div id="impress">\n${stepMarkup}\n    </div>\n${scripts}\n  </body>\n</html>\n`;
}
