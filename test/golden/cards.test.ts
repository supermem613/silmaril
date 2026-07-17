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

interface CardsRouteProjection {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotate: number;
  readonly content: string;
}

interface CardsThemeProjection {
  readonly css: string;
  readonly routes: readonly CardsRouteProjection[];
}

const expectedRoutes = [
  { id: 'intro', x: 0, y: 0, scale: 1, rotate: 0 },
  { id: 'problem', x: 1700, y: -150, scale: 1, rotate: 0 },
  { id: 'triangle', x: 3450, y: 150, scale: 1, rotate: 6 },
  { id: 'approaches', x: 3450, y: 1750, scale: 1, rotate: 6 },
  { id: 'rec', x: 1700, y: 1900, scale: 1, rotate: 0 },
  { id: 'pipeline', x: -100, y: 1900, scale: 1, rotate: 0 },
  { id: 'spike', x: -1750, y: 1750, scale: 1, rotate: -6 },
  { id: 'kill', x: -1750, y: 150, scale: 1, rotate: -6 },
  { id: 'next', x: -100, y: -1600, scale: 1, rotate: 0 },
] as const;

function buildCardsHtml(source: string, inputDirectory: string): string {
  const scene = parseScene(source);
  const theme = getTheme('cards');
  const sceneSteps = scene.regions.map((region) => ({
    id: region.id,
    title: region.title,
    groupId: region.groupId,
    x: region.attrs.x,
    y: region.attrs.y,
    scale: region.attrs.scale,
    rotate: region.attrs.rotate,
  }));
  const layout = layoutScene(sceneSteps);
  const layoutPlacements = new Map(
    [...layout.overview, ...layout.groups.flatMap((group) => group.steps)]
      .map((placement) => [placement.id, placement]),
  );

  const renderedRegions = scene.regions.map((region) => {
    const content = renderRegion(inlineMarkdown(region.body, inputDirectory).markdown);
    const placement = layoutPlacements.get(region.id);
    const authoredPatch = selectSparseLayoutPatch({
      x: region.attrs.x === undefined ? undefined : placement?.x ?? region.attrs.x,
      y: region.attrs.y === undefined ? undefined : placement?.y ?? region.attrs.y,
      scale: region.attrs.scale === undefined ? undefined : placement?.scale ?? region.attrs.scale,
      rotate: region.attrs.rotate === undefined ? undefined : placement?.rotate ?? region.attrs.rotate,
    });

    return {
      id: region.id,
      title: region.title,
      content,
      ...authoredPatch,
    };
  });

  const html = assemble(theme, renderedRegions);
  validateBuildOutput(html);
  return html;
}

function readAttribute(attributes: string, name: string): string | undefined {
  return attributes.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1];
}

function unwrapGeneratedStepCard(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^<div class=["']step-card["']>([\s\S]*)<\/div>$/);
  return match?.[1]?.trim() ?? trimmed;
}

function normalizeRegionMarkup(content: string): string {
  return canonicalizeHtml(content)
    .split('\n')
    .map((line) => line.trim())
    .join('');
}

function projectCardsTheme(html: string): CardsThemeProjection {
  const canonical = canonicalizeHtml(html);
  const css = canonical.match(/<style>([\s\S]*?)<\/style>/i)?.[1]?.trim();
  assert.ok(css, 'expected an inline cards theme style block');

  const starts = [...canonical.matchAll(/<div\b([^>]*\bclass=["']([^"']*)["'][^>]*)>/gi)]
    .filter((match) => (match[2] ?? '').split(/\s+/).includes('step'))
    .map((match) => ({
      attributes: match[1] ?? '',
      start: match.index ?? 0,
      contentStart: (match.index ?? 0) + match[0].length,
    }));

  const routes = starts.flatMap((start, index): CardsRouteProjection[] => {
    const id = readAttribute(start.attributes, 'data-id') ?? readAttribute(start.attributes, 'id');
    if (!id || id === 'overview') {
      return [];
    }

    const end = starts[index + 1]?.start ?? canonical.indexOf('</div>', start.contentStart);
    const segment = canonical.slice(start.contentStart, end);
    const stepClose = segment.lastIndexOf('</div>');
    assert.notEqual(stepClose, -1, `expected closing markup for cards route ${id}`);
    const content = normalizeRegionMarkup(unwrapGeneratedStepCard(segment.slice(0, stepClose)));

    return [{
      id,
      x: Number(readAttribute(start.attributes, 'data-x') ?? 0),
      y: Number(readAttribute(start.attributes, 'data-y') ?? 0),
      scale: Number(readAttribute(start.attributes, 'data-scale') ?? 1),
      rotate: Number(readAttribute(start.attributes, 'data-rotate') ?? 0),
      content,
    }];
  });

  return { css, routes };
}

test('renders the accepted cards theme projection', () => {
  const sourcePath = fileURLToPath(new URL('../corpus/cases/cards-tour.md', import.meta.url));
  const source = readFileSync(sourcePath, 'utf8');
  const inputDirectory = dirname(sourcePath);
  const scene = parseScene(source);

  assert.deepEqual(
    scene.regions.map((region) => ({
      id: region.id,
      x: region.attrs.x,
      y: region.attrs.y,
      scale: region.attrs.scale,
      rotate: region.attrs.rotate ?? 0,
    })),
    expectedRoutes,
  );

  const generatedHtml = buildCardsHtml(source, inputDirectory);
  const generatedCanonical = canonicalizeHtml(generatedHtml);
  assert.match(generatedCanonical, /<strong>spatial context<\/strong>/);
  assert.match(generatedCanonical, /<code>markdown<\/code> → <code>scene IR<\/code> → <code>pure layout<\/code> → <code>self-contained HTML<\/code>/);
  assert.match(generatedCanonical, /freeze it as the golden fixture/i);
  assert.match(generatedCanonical, /Dead end — not self-hosted/);

  const tempDirectory = mkdtempSync(join(tmpdir(), 'silmaril-cards-'));
  try {
    const outputPath = join(tempDirectory, 'cards-output.html');
    writeFileSync(outputPath, generatedHtml, 'utf8');
    const validatorResult = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('../../scripts/validate.mjs', import.meta.url)), outputPath, '--profile', 'canvas', '--json'],
      { encoding: 'utf8' },
    );
    assert.equal(validatorResult.status, 0, validatorResult.stdout || validatorResult.stderr);
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }

  const prototypePath = fileURLToPath(new URL('../../fixtures/prototypes/cards/talk.html', import.meta.url));
  const prototypeHtml = readFileSync(prototypePath, 'utf8');
  assert.deepEqual(
    projectCardsTheme(generatedHtml),
    projectCardsTheme(prototypeHtml),
    'the complete cards-controlled CSS, authored route transforms, and region markup must match the frozen prototype',
  );
});

test('preserves ordinary cards region titles and sanitized body markup', () => {
  const theme = getTheme('cards');
  assert.equal(
    theme.renderRegion?.({
      id: 'plain-region',
      title: 'Plain & Safe',
      content: '<p>Ordinary body text.</p><img src="data:image/png;base64,AA==" alt="Example"><pre><code class="language-ts">const value = 1;</code></pre>',
    }, { theme }),
    '<h2>Plain &amp; Safe</h2><p>Ordinary body text.</p><img src="data:image/png;base64,AA==" alt="Example"><pre><code class="language-ts">const value = 1;</code></pre>',
  );
});

test('uses only the first top-level semantic paragraph as the eyebrow', () => {
  const theme = getTheme('cards');
  assert.equal(
    theme.renderRegion?.({
      id: 'structured-region',
      title: 'Structured Region',
      content: '<ul><li><p>Nested paragraph.</p></li></ul><p>Top-level eyebrow.</p><h2>Visible heading</h2><p>Ordinary body.</p>',
    }, { theme }),
    '<ul><li><p>Nested paragraph.</p></li></ul><p class="eyebrow">Top-level eyebrow.</p><h2>Visible heading</h2><p>Ordinary body.</p>',
  );
});
