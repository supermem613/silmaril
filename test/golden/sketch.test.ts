import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assemble } from '../../src/pipeline/assemble.js';
import { inlineMarkdown } from '../../src/pipeline/inline.js';
import { layoutScene, selectSparseLayoutPatch } from '../../src/pipeline/layout.js';
import { parseScene } from '../../src/pipeline/parse.js';
import { renderRegion } from '../../src/pipeline/render.js';
import { validateBuildOutput } from '../../src/pipeline/validate.js';
import { getTheme } from '../../src/theme/registry.js';
import { canonicalizeHtml } from '../corpus/harness.js';

interface SketchRoute {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

interface SketchProjection {
  readonly css: string;
  readonly board: string;
  readonly routes: readonly SketchRoute[];
}

function buildSketchHtml(source: string, inputDirectory: string): string {
  const scene = parseScene(source);
  const theme = getTheme('sketch');
  const layout = layoutScene(scene.regions.map((region) => ({
    id: region.id,
    title: region.title,
    groupId: region.groupId,
    x: region.attrs.x,
    y: region.attrs.y,
    scale: region.attrs.scale,
    rotate: region.attrs.rotate,
  })));
  const placements = new Map(
    [...layout.overview, ...layout.groups.flatMap((group) => group.steps)]
      .map((placement) => [placement.id, placement]),
  );
  const regions = scene.regions.map((region) => {
    const placement = placements.get(region.id);
    return {
      id: region.id,
      title: region.title,
      content: renderRegion(inlineMarkdown(region.body, inputDirectory).markdown),
      ...selectSparseLayoutPatch({
        x: region.attrs.x === undefined ? undefined : placement?.x ?? region.attrs.x,
        y: region.attrs.y === undefined ? undefined : placement?.y ?? region.attrs.y,
        scale: region.attrs.scale === undefined ? undefined : placement?.scale ?? region.attrs.scale,
        rotate: region.attrs.rotate === undefined ? undefined : placement?.rotate ?? region.attrs.rotate,
      }),
    };
  });
  const html = assemble(theme, regions);
  validateBuildOutput(html);
  return html;
}

function readAttribute(attributes: string, name: string): string | undefined {
  return attributes.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1];
}

function normalizeMarkup(value: string): string {
  return canonicalizeHtml(value)
    .split('\n')
    .map((line) => line.trim())
    .join('');
}

function projectSketch(html: string): SketchProjection {
  const canonical = canonicalizeHtml(html);
  const css = canonical.match(/<style>([\s\S]*?)<\/style>/i)?.[1]?.trim();
  const board = canonical.match(/<div id="world">[\s\S]*?<\/svg><\/div><\/div>/i)?.[0];
  assert.ok(css, 'expected sketch CSS');
  assert.ok(board, 'expected one shared sketch board');

  const routes = [...canonical.matchAll(/<div\b([^>]*\bclass=["']([^"']*)["'][^>]*)>/gi)]
    .filter((match) => (match[2] ?? '').split(/\s+/).includes('step'))
    .map((match): SketchRoute => {
      const attributes = match[1] ?? '';
      const id = readAttribute(attributes, 'data-id') ?? readAttribute(attributes, 'id');
      assert.ok(id, 'expected sketch route id');
      return {
        id,
        x: Number(readAttribute(attributes, 'data-x') ?? 0),
        y: Number(readAttribute(attributes, 'data-y') ?? 0),
        scale: Number(readAttribute(attributes, 'data-scale') ?? 1),
      };
    });

  return {
    css,
    board: normalizeMarkup(board),
    routes,
  };
}

test('renders the accepted sketch board projection', () => {
  const sourcePath = fileURLToPath(new URL('../corpus/cases/sketch-tour.md', import.meta.url));
  const source = readFileSync(sourcePath, 'utf8');
  const first = buildSketchHtml(source, dirname(sourcePath));
  const second = buildSketchHtml(source, dirname(sourcePath));
  assert.equal(first, second);

  const prototypePath = fileURLToPath(new URL('../../fixtures/prototypes/sketch/sketch-board.html', import.meta.url));
  const prototype = readFileSync(prototypePath, 'utf8');
  assert.deepEqual(projectSketch(first), projectSketch(prototype));

  const tempDirectory = mkdtempSync(join(tmpdir(), 'silmaril-sketch-'));
  try {
    const outputPath = join(tempDirectory, 'sketch-output.html');
    writeFileSync(outputPath, first, 'utf8');
    const validator = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('../../scripts/validate.mjs', import.meta.url)), outputPath, '--profile', 'canvas', '--json'],
      { encoding: 'utf8' },
    );
    assert.equal(validator.status, 0, validator.stdout || validator.stderr);
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('preserves ordinary sketch region titles and sanitized content', () => {
  const theme = getTheme('sketch');
  assert.equal(
    theme.renderRegion?.({
      id: 'custom-note',
      title: 'Custom & Safe',
      content: '<p>Visible body.</p><code class="language-ts">value</code>',
    }, { theme }),
    '<div style="width:640px;min-height:320px;padding:34px 40px;box-sizing:border-box;background:#fffaf0;border:3px solid #2b2620;box-shadow:8px 8px 0 rgba(43,38,32,.22);font-family:Kalam,cursive;color:#2b2620"><h2 style="font-size:48px;margin:0 0 18px">Custom &amp; Safe</h2><div style="font-size:28px;line-height:1.4"><p>Visible body.</p><code class="language-ts">value</code></div></div>',
  );
});

test('preserves authored content when a sketch region uses an accepted route id', () => {
  const html = assemble(getTheme('sketch'), [{
    id: 'cover',
    title: 'Cover',
    content: '<p>User-authored cover content.</p>',
  }]);

  assert.match(html, /<h2[^>]*>Cover<\/h2>/);
  assert.match(html, /<p>User-authored cover content\.<\/p>/);
});

test('preserves custom titles across the complete accepted sketch route set', () => {
  const routeIds = ['cover', 'itch', 'map', 'md', 'pipe', 'pipe-detail', 'look', 'road', 'finis'];
  const html = assemble(
    getTheme('sketch'),
    routeIds.map((id, index) => ({
      id,
      title: index === 0 ? 'Custom Cover' : `Custom ${id}`,
      content: '',
    })),
  );

  assert.match(html, /<h2[^>]*>Custom Cover<\/h2>/);
  assert.match(html, /<h2[^>]*>Custom finis<\/h2>/);
});
