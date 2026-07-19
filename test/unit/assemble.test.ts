import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { assemble } from '../../src/pipeline/assemble.js';
import { parseScene } from '../../src/pipeline/parse.js';
import type { Theme } from '../../src/theme/contract.js';
import { plainTheme } from '../../src/theme/plain.js';
import { getTheme } from '../../src/theme/registry.js';

const publicThemes = ['cards', 'atlas', 'sketch'] as const;

function readStepAttribute(attributes: string, name: string): string | undefined {
  return attributes.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
}

function projectSteps(html: string) {
  return [...html.matchAll(/<div class="([^"]*\bstep\b[^"]*)" ([^>]*)>/g)].map((match) => ({
    className: match[1] ?? '',
    attributes: match[2] ?? '',
  }));
}

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

test('initializes impress through its public factory API', () => {
  const html = assemble(plainTheme(), [{
    id: 'only',
    title: 'Only',
    content: 'Body',
  }]);

  assert.match(
    html,
    /<script>if \(typeof window\.impress === 'function'\) \{ window\.impress\(\)\.init\(\); \}<\/script>/,
  );
});

for (const themeName of publicThemes) {
  test(`${themeName} opens on a content-free overview that frames every region`, () => {
    const html = assemble(getTheme(themeName), [
      { id: 'one', title: 'One', content: 'First' },
      { id: 'two', title: 'Two', content: 'Second' },
      { id: 'three', title: 'Three', content: 'Third' },
      { id: 'four', title: 'Four', content: 'Fourth' },
      { id: 'five', title: 'Five', content: 'Fifth' },
      { id: 'six', title: 'Six', content: 'Sixth' },
    ]);
    const steps = projectSteps(html);
    const overview = steps[0];

    assert.equal(readStepAttribute(overview?.attributes ?? '', 'data-id'), 'overview');
    assert.match(overview?.className ?? '', /\boverview\b/);
    assert.match(overview?.className ?? '', /\bcamera-overview\b/);
    assert.match(
      html,
      /<div class="step overview camera-overview" [^>]*data-id="overview"[^>]*style="[^"]*background:transparent;[^"]*border:0;[^"]*box-shadow:none[^"]*"[^>]*><\/div>/,
      'the whole-board camera must not render prototype copy or another presentation card',
    );

    const authored = steps.slice(1);
    const placements = authored.map((step) => ({
      x: Number(readStepAttribute(step.attributes, 'data-x')),
      y: Number(readStepAttribute(step.attributes, 'data-y')),
      scale: Number(readStepAttribute(step.attributes, 'data-scale') ?? 1),
    }));
    assert.equal(
      new Set(placements.map((placement) => `${placement.x},${placement.y},${placement.scale}`)).size,
      authored.length,
      'every region must have a distinct place on the board',
    );

    const expectedX = (Math.min(...placements.map((placement) => placement.x))
      + Math.max(...placements.map((placement) => placement.x))) / 2;
    const expectedY = (Math.min(...placements.map((placement) => placement.y))
      + Math.max(...placements.map((placement) => placement.y))) / 2;
    assert.equal(Number(readStepAttribute(overview?.attributes ?? '', 'data-x')), expectedX);
    assert.equal(Number(readStepAttribute(overview?.attributes ?? '', 'data-y')), expectedY);
  });
}

test('cards renders the automatic overview as a transparent camera target', () => {
  const html = assemble(getTheme('cards'), [
    { id: 'one', title: 'One', content: 'First' },
    { id: 'two', title: 'Two', content: 'Second' },
  ]);

  assert.match(
    html,
    /<div class="step overview camera-overview" [^>]*style="[^"]*background:transparent;[^"]*border:0;[^"]*box-shadow:none[^"]*"/,
  );
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
