import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assemble } from '../../src/pipeline/assemble.js';
import { inlineMarkdown } from '../../src/pipeline/inline.js';
import { parseHeadingBoard } from '../../src/pipeline/parse.js';
import { renderRegion } from '../../src/pipeline/render.js';
import { validateBuildOutput } from '../../src/pipeline/validate.js';
import { getTheme } from '../../src/theme/registry.js';
import { canonicalizeHtml } from '../corpus/harness.js';

function buildEngineeringMermaidHtml(source: string, inputDirectory: string): string {
  const board = parseHeadingBoard(source);
  assert.equal(board.title, 'Engineering Board');
  assert.equal(board.slides.length, 1);
  assert.equal(board.slides[0].title, 'System Overview');

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

test('renders mermaid fences as deterministic inline SVG in the engineering board', () => {
  const sourcePath = fileURLToPath(new URL('../corpus/cases/engineering-mermaid.md', import.meta.url));
  const source = readFileSync(sourcePath, 'utf8');
  const firstHtml = buildEngineeringMermaidHtml(source, dirname(sourcePath));
  const secondHtml = buildEngineeringMermaidHtml(source, dirname(sourcePath));
  const firstCanonical = canonicalizeHtml(firstHtml);
  const secondCanonical = canonicalizeHtml(secondHtml);

  assert.equal(firstCanonical, secondCanonical, 'expected repeated builds to be byte-identical');
  assert.doesNotMatch(firstCanonical, /<pre><code\b/i, 'The generated engineering HTML contains the Mermaid source as code instead of deterministic inline SVG.');
  assert.match(firstCanonical, /<svg\b[^>]*>/i, 'expected deterministic inline SVG for mermaid fences');
  assert.match(firstCanonical, /--token-/i, 'expected shared-token color variables for deterministic inline SVG');
  assert.match(firstCanonical, /impress\(\)\.init\(\)/i, 'expected the self-contained impress initialization script');
  assert.match(firstCanonical, /silmaril-engineering-theme/i, 'expected the self-contained theme-toggle script');
  assert.doesNotMatch(firstCanonical, /<script\b[^>]*\bsrc=["'][^"']*mermaid/i, 'expected no Mermaid runtime script');
  assert.doesNotMatch(firstCanonical, /\bwindow\.mermaid\s*=/i, 'expected no embedded Mermaid runtime');
  assert.doesNotMatch(firstCanonical, /https?:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com)\/[^"' ]*mermaid/i, 'expected no remote Mermaid reference');
});
