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
  assert.match(canonical, /#0B0D0E/);
  assert.match(canonical, /<button\b[^>]*>/i);
  assert.match(canonical, /<button\b[^>]*(aria-label|aria-labelledby|title)=/i);
  assert.match(canonical, /light/i);
  assert.match(canonical, /--light-[^:]+:/i);
  assert.match(canonical, /--dark-[^:]+:/i);
  assert.match(canonical, /data-theme|data-attribute|data-.*theme/i);
  assert.match(canonical, /prefers-reduced-motion/i);
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
