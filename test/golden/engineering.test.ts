import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assemble } from '../../src/pipeline/assemble.js';
import { inlineMarkdown } from '../../src/pipeline/inline.js';
import { parseHeadingBoard } from '../../src/pipeline/parse.js';
import { renderRegion } from '../../src/pipeline/render.js';
import { validateBuildOutput } from '../../src/pipeline/validate.js';
import { getTheme } from '../../src/theme/registry.js';
import { canonicalizeHtml } from '../corpus/harness.js';

function buildEngineeringHtml(source: string, inputDirectory: string): string {
  const board = parseHeadingBoard(source);
  assert.equal(board.title, 'Engineering Board');
  assert.deepEqual(
    board.slides.map((slide) => slide.title),
    ['System Overview', 'Delivery Focus', 'Operations Readiness'],
  );

  const theme = getTheme('engineering');
  const regions = board.slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    content: renderRegion(inlineMarkdown(slide.body, inputDirectory).markdown),
  }));

  const html = assemble(theme, regions, { documentTitle: board.title });
  validateBuildOutput(html);
  return html;
}

function loadCanonicalEngineeringDeck(): string {
  const sourcePath = fileURLToPath(new URL('../corpus/cases/engineering-deck.md', import.meta.url));
  const source = readFileSync(sourcePath, 'utf8');
  return canonicalizeHtml(buildEngineeringHtml(source, dirname(sourcePath)));
}

test('applies true black to the engineering page canvas', () => {
  const canonical = loadCanonicalEngineeringDeck();
  assert.match(canonical, /--dark-bg\s*:\s*#000000/i, 'expected the dark canvas token to use true black');
  assert.match(canonical, /html\s*,\s*body\.engineering-theme\s*\{[^}]*background\s*:\s*var\(--dark-bg\)/i);
});

test('keeps the presentation title visible above the whole-board overview', () => {
  const canonical = loadCanonicalEngineeringDeck();
  const body = canonical.slice(canonical.indexOf('<body'));
  assert.match(body, /engineering-board-title[\s\S]*<h1>Engineering Board<\/h1>/i);
});

test('keeps engineering chrome minimal and slide typography readable', () => {
  const canonical = loadCanonicalEngineeringDeck();
  assert.match(canonical, /:root\s*\{[^}]*--dark-text\s*:\s*#F3F7F6/i);
  assert.match(canonical, /font-family\s*:\s*"Segoe UI Variable Text"/i);
  assert.doesNotMatch(canonical, /engineering-card__eyebrow/i);
  assert.doesNotMatch(canonical, /engineering-shell__title/i);
  assert.doesNotMatch(canonical, /Engineering presentation/i);
  assert.match(canonical, /shell\.parentElement !== document\.body/);
  assert.match(canonical, /body:not\(:has\(\.step\.active\[data-id="overview"\]\)\) \.engineering-shell/);

  const headingRule = canonical.match(/\.engineering-card h2\s*\{([^}]*)\}/i)?.[1] ?? '';
  const headingSize = Number(headingRule.match(/font-size\s*:\s*([\d.]+)rem/i)?.[1] ?? 0);
  assert.ok(headingSize >= 2.5, `expected readable slide headings, received ${headingSize}rem`);
});

test('animates board entry while cutting directly between focused slides', () => {
  const canonical = loadCanonicalEngineeringDeck();
  assert.match(canonical, /active\[data-id="overview"\]/);
  assert.match(canonical, /closest\('\.step:not\(\.overview\)'\)/);
  assert.match(canonical, /impress\(\)\.goto\(step\)/);
  assert.match(canonical, /impress\(\)\.goto\(overview\)/);
  assert.doesNotMatch(canonical, /impress\(\)\.goto\(overview, 0\)/);
  assert.match(canonical, /addPreStepLeavePlugin/);
  assert.match(
    canonical,
    /current[\s\S]*?!current\.classList\.contains\('overview'\)[\s\S]*?!next\.classList\.contains\('overview'\)[\s\S]*?event\.detail\.transitionDuration\s*=\s*0/,
  );
});

test('sizes focused engineering cards to use most of the viewport', () => {
  const canonical = loadCanonicalEngineeringDeck();
  assert.match(canonical, /<div id="impress"[^>]*data-max-scale="2"/i);
  const cardRule = canonical.match(/\.engineering-card\s*\{([^}]*)\}/i)?.[1] ?? '';
  const cardWidth = Number(cardRule.match(/\bwidth\s*:\s*(\d+)px/i)?.[1] ?? 0);
  const cardMinHeight = Number(cardRule.match(/\bmin-height\s*:\s*(\d+)px/i)?.[1] ?? 0);
  assert.ok(cardWidth >= 1000, `expected focused engineering cards to use the viewport width, received ${cardWidth}px`);
  assert.ok(cardMinHeight >= 700, `expected focused engineering cards to use the viewport height, received ${cardMinHeight}px`);
  assert.match(canonical, /data-x="1200"[^>]*data-id="delivery-focus"/i);
});

test('renders the accepted engineering deck: dark-first tokens, ordered slides, and a persistent labelled light-mode toggle', () => {
  const sourcePath = fileURLToPath(new URL('../corpus/cases/engineering-deck.md', import.meta.url));
  const source = readFileSync(sourcePath, 'utf8');
  const html = buildEngineeringHtml(source, dirname(sourcePath));
  const canonical = canonicalizeHtml(html);

  assert.match(canonical, /<!doctype html>/i);
  assert.match(canonical, /<html[^>]*>/i);
  assert.match(canonical, /<body[^>]*>/i);
  assert.match(canonical, /Engineering Board/);
  assert.match(canonical, /System Overview/);
  assert.match(canonical, /Delivery Focus/);
  assert.match(canonical, /Operations Readiness/);
  assert.match(canonical, /#000000/);
  assert.match(canonical, /<button\b[^>]*>/i);
  assert.match(canonical, /<button\b[^>]*(aria-label|aria-labelledby|title)=/i);
  assert.match(canonical, /light/i);
  assert.match(canonical, /--light-[^:]+:/i);
  assert.match(canonical, /--dark-[^:]+:/i);
  assert.match(canonical, /data-theme|data-attribute|data-.*theme/i);
  assert.match(canonical, /prefers-reduced-motion/i);
  assert.match(canonical, /event\.key === 'Tab'/);
  assert.match(canonical, /document\.addEventListener\('DOMContentLoaded', installNavigation/);
  assert.match(canonical, /window\.addEventListener\('keyup', handleNavigation, true\)/);
  assert.match(canonical, /active === lastSlide/);
  assert.match(canonical, /data-id="overview"/);
  assert.match(canonical, /impress\(\)\.goto\(overview\)/);
  assert.doesNotMatch(canonical, /Math\.random/);
  assert.doesNotMatch(canonical, /prefers-color-scheme/i);

  const tempDirectory = mkdtempSync(join(tmpdir(), 'silmaril-engineering-'));
  try {
    const outputPath = join(tempDirectory, 'engineering-output.html');
    writeFileSync(outputPath, html, 'utf8');
    const validator = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('../../scripts/validate.mjs', import.meta.url)),
        outputPath,
        '--profile',
        'canvas',
        '--json',
      ],
      { encoding: 'utf8' },
    );
    assert.equal(validator.status, 0, validator.stdout || validator.stderr);
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});
