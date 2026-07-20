import type { Theme, ThemeRegionDescriptor, ThemeSourcePayload } from '../contract.js';
import { engineeringEditorMarkup, engineeringEditorScript } from './editor.js';
import { engineeringExportMarkup, engineeringExportScript } from './export.js';
import { engineeringTokensCss } from './tokens.css.js';
import {
  engineeringNavigationScript,
  engineeringProgressMarkup,
  engineeringToggleMarkup,
  engineeringToggleScript,
} from './toggle.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsonScriptText(value: string): string {
  return value
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function buildSourceScript(sourcePayload: ThemeSourcePayload | undefined): string {
  if (!sourcePayload) {
    return '';
  }

  return `<script type="application/json" id="silmaril-source">${escapeJsonScriptText(JSON.stringify(sourcePayload, null, 2))}</script>`;
}

function buildBoardSignature(version: string | undefined, repositoryUrl: string | undefined): string {
  if (!version) {
    return '';
  }

  const productName = repositoryUrl
    ? `<a href="${escapeHtml(repositoryUrl)}" target="_blank" rel="noreferrer">silmaril</a>`
    : 'silmaril';
  return `<div class="engineering-board-signature">${productName} · ${escapeHtml(version)}</div>`;
}

export function engineeringTheme(): Theme {
  return {
    name: 'engineering',
    title: 'Engineering Board',
    backgroundColor: '#000000',
    accentColor: '#67D3C2',
    bodyClass: 'engineering-theme',
    viewport: 'width=device-width, initial-scale=1',
    globalCss: engineeringTokensCss,
    scenery: () => `${engineeringToggleMarkup()}${engineeringProgressMarkup()}${engineeringToggleScript}${engineeringNavigationScript}`,
    renderOverview: ({ documentTitle, version, repositoryUrl, sourcePayload }) => `
      <div class="engineering-board-title">
        <h1>${escapeHtml(documentTitle)}</h1>
      </div>
      ${buildSourceScript(sourcePayload)}
      ${buildBoardSignature(version, repositoryUrl)}
      ${sourcePayload ? `${engineeringEditorMarkup()}${engineeringEditorScript}${engineeringExportMarkup()}${engineeringExportScript}` : ''}
    `,
    impressAttributes: {
      width: 1120,
      height: 820,
      'max-scale': 2,
    },
    overview: 'auto',
    layout: (regions) => {
      const columns = Math.min(Math.max(regions.length, 1), 5);
      return regions.map((region, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const itemsInRow = Math.min(columns, regions.length - row * columns);
        const rowOffset = ((columns - itemsInRow) * 1200) / 2;
        return {
          id: region.id,
          title: region.title,
          x: rowOffset + column * 1200,
          y: row * 900,
          z: 0,
          scale: 1,
          rotate: 0,
        };
      });
    },
    wrapRegion: false,
    renderRegion(region: ThemeRegionDescriptor) {
      return `
        <div class="engineering-card" data-theme="dark">
          <h2>${escapeHtml(region.title)}</h2>
          <div class="engineering-card__content" data-slide-content>${region.content}</div>
        </div>
      `;
    },
  };
}
