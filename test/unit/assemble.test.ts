import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { assemble } from '../../src/pipeline/assemble.js';
import { parseScene } from '../../src/pipeline/parse.js';
import type { Theme } from '../../src/theme/contract.js';
import { plainTheme } from '../../src/theme/plain.js';

test('test/unit/assemble.test.ts', () => {
  const theme = plainTheme();
  const regions = [
    { id: 'intro', title: 'Intro', content: 'Welcome' },
    { id: 'details', title: 'Details', content: 'More details' },
  ];

  const expectedDocument = readFileSync(fileURLToPath(new URL('../golden/plain.html', import.meta.url)), 'utf8');
  const html = assemble(theme, regions);
  assert.equal(html, expectedDocument);
});

test('uses authored placement values in the rendered impress step', () => {
  const theme = plainTheme();
  const markdown = `---
title: Placement
---
- Intro
  - @silmaril:
    - x: 300
    - y: 120
    - scale: 2.5
    - rotate: 45
`;
  const scene = parseScene(markdown);
  const authoredRegion = scene.regions[0];
  assert.equal(authoredRegion.attrs.x, 300);
  assert.equal(authoredRegion.attrs.y, 120);
  assert.equal(authoredRegion.attrs.scale, 2.5);
  assert.equal(authoredRegion.attrs.rotate, 45);

  const authoredRegionWithPlacement = {
    id: authoredRegion.id,
    title: authoredRegion.title,
    content: 'Welcome',
    x: authoredRegion.attrs.x,
    y: authoredRegion.attrs.y,
    scale: authoredRegion.attrs.scale,
    rotate: authoredRegion.attrs.rotate,
  };

  const regions = [authoredRegionWithPlacement];
  const html = assemble(theme, regions);

  assert.ok(html.includes('data-x="300"'), 'assembled impress step does not contain the authored x/y/scale/rotate values and instead uses default placement');
  assert.ok(html.includes('data-y="120"'), 'assembled impress step does not contain the authored x/y/scale/rotate values and instead uses default placement');
  assert.ok(html.includes('data-scale="2.5"'), 'assembled impress step does not contain the authored x/y/scale/rotate values and instead uses default placement');
  assert.ok(html.includes('data-rotate="45"'), 'assembled impress step does not contain the authored x/y/scale/rotate values and instead uses default placement');
});

test('uses a sparse authored x override over a custom theme layout', () => {
  const theme = {
    ...plainTheme(),
    name: 'custom-layout',
    layout: (regions: readonly { id: string; title: string; content: string }[]) => regions.map((region, index) => ({
      id: region.id,
      title: region.title,
      x: index * 1000 + 50,
      y: 200 + index * 10,
      z: 0,
      scale: 2,
      rotate: 30,
    })),
  };

  const html = assemble(theme, [{ id: 'intro', title: 'Intro', content: 'Welcome', x: 300 }]);

  assert.ok(html.includes('data-x="300"'));
  assert.ok(html.includes('data-y="200"'));
  assert.ok(html.includes('data-scale="2"'));
  assert.ok(html.includes('data-rotate="30"'));
});

test('renders shared theme scenery and configured presentation chrome', () => {
  const theme: Theme = {
    name: 'configured',
    title: 'Configured Canvas',
    bodyClass: 'impress-not-supported',
    viewport: 'width=1024, user-scalable=no',
    fallbackHtml: '<div class="fallback-message">Fallback</div>',
    hintHtml: '<div class="hint">Hint</div>',
    impressAttributes: {
      'transition-duration': 1100,
      width: 1024,
    },
    scenery: '<div id="world">Shared world</div>',
    wrapRegion: false,
    overview: {
      x: 850,
      y: 150,
      scale: 7,
      content: '<h1>The whole map</h1>',
    },
    stepClassName: () => 'loc',
    renderRegion: (region) => `<h2>${region.title}</h2>${region.content}`,
  };

  const html = assemble(theme, [{
    id: 'first',
    title: 'First',
    content: '<p>Body</p>',
  }]);

  assert.match(html, /<meta name="viewport" content="width=1024, user-scalable=no" \/>/);
  assert.match(html, /<title>Configured Canvas<\/title>/);
  assert.match(html, /<body class="impress-not-supported">/);
  assert.match(html, /<div class="fallback-message">Fallback<\/div>/);
  assert.match(html, /<div id="impress" data-transition-duration="1100" data-width="1024">/);
  assert.match(html, /<div id="world">Shared world<\/div>[\s\S]*<div class="step loc"/);
  assert.match(html, /data-id="first"><h2>First<\/h2><p>Body<\/p><\/div>/);
  assert.match(html, /data-x="850"[^>]*data-y="150"[^>]*data-id="overview"[^>]*data-scale="7"/);
  assert.match(html, /<h1>The whole map<\/h1>/);
  assert.match(html, /<div class="hint">Hint<\/div>/);
});

test('can disable the generated overview step', () => {
  const theme: Theme = {
    name: 'no-overview',
    overview: false,
  };

  const html = assemble(theme, [{
    id: 'only',
    title: 'Only',
    content: 'Body',
  }]);

  assert.match(html, /data-id="only"/);
  assert.equal(html.match(/data-id="/g)?.length, 1);
});
