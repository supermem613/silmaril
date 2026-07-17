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

interface AtlasRoute {
  readonly id: string;
  readonly loc: boolean;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly content: string;
}

interface AtlasProjection {
  readonly css: string;
  readonly world: string;
  readonly routes: readonly AtlasRoute[];
}

function buildAtlasHtml(source: string, inputDirectory: string): string {
  const scene = parseScene(source);
  const theme = getTheme('atlas');
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
    .replace(/&rarr;/g, '→')
    .split('\n')
    .map((line) => line.trim())
    .join('');
}

function projectAtlas(html: string): AtlasProjection {
  const canonical = canonicalizeHtml(html);
  const css = canonical.match(/<style>([\s\S]*?)<\/style>/i)?.[1]?.trim();
  const world = canonical.match(/<div id="world">[\s\S]*?<\/svg><\/div><\/div>/i)?.[0];
  assert.ok(css, 'expected atlas CSS');
  assert.ok(world, 'expected one shared atlas world');

  const starts = [...canonical.matchAll(/<div\b([^>]*\bclass=["']([^"']*)["'][^>]*)>/gi)]
    .filter((match) => (match[2] ?? '').split(/\s+/).includes('step'))
    .map((match) => ({
      attributes: match[1] ?? '',
      classes: (match[2] ?? '').split(/\s+/),
      start: match.index ?? 0,
      contentStart: (match.index ?? 0) + match[0].length,
    }));
  const routes = starts.map((start, index): AtlasRoute => {
    const id = readAttribute(start.attributes, 'data-id') ?? readAttribute(start.attributes, 'id');
    assert.ok(id, 'expected atlas route id');
    const nextStart = starts[index + 1]?.start;
    const directClose = canonical.indexOf('</div>', start.contentStart);
    const segment = canonical.slice(start.contentStart, nextStart ?? directClose);
    const stepClose = nextStart === undefined ? segment.length : segment.lastIndexOf('</div>');
    assert.notEqual(stepClose, -1, `expected closing markup for atlas route ${id}`);
    return {
      id,
      loc: start.classes.includes('loc'),
      x: Number(readAttribute(start.attributes, 'data-x') ?? 0),
      y: Number(readAttribute(start.attributes, 'data-y') ?? 0),
      scale: Number(readAttribute(start.attributes, 'data-scale') ?? 1),
      content: normalizeMarkup(segment.slice(0, stepClose)),
    };
  });

  return {
    css,
    world: normalizeMarkup(world),
    routes,
  };
}

test('renders the accepted atlas presentation projection', () => {
  const sourcePath = fileURLToPath(new URL('../corpus/cases/atlas-tour.md', import.meta.url));
  const source = readFileSync(sourcePath, 'utf8');
  const first = buildAtlasHtml(source, dirname(sourcePath));
  const second = buildAtlasHtml(source, dirname(sourcePath));
  assert.equal(first, second);

  const prototypePath = fileURLToPath(new URL('../../fixtures/prototypes/atlas/middle-earth.html', import.meta.url));
  const prototype = readFileSync(prototypePath, 'utf8');
  assert.deepEqual(projectAtlas(first), projectAtlas(prototype));

  const tempDirectory = mkdtempSync(join(tmpdir(), 'silmaril-atlas-'));
  try {
    const outputPath = join(tempDirectory, 'atlas-output.html');
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

test('preserves ordinary atlas region titles and sanitized content', () => {
  const theme = getTheme('atlas');
  assert.equal(
    theme.renderRegion?.({
      id: 'custom-stop',
      title: 'Custom & Safe',
      content: '<p>Visible body.</p><code class="language-ts">value</code>',
    }, { theme }),
    '<div class="card"><h2>Custom &amp; Safe</h2><div class="tag"><p>Visible body.</p><code class="language-ts">value</code></div></div><div class="pinpoint"></div>',
  );
});
