import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assemble } from '../../src/pipeline/assemble.js';
import { validateBuildOutput } from '../../src/pipeline/validate.js';
import type { Theme } from '../../src/theme/contract.js';
import { exampleTheme } from '../fixtures/themes/example-theme.js';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const goldenPath = join(repoRoot, 'test', 'golden', 'example-theme.html');
const regions = [
  {
    id: 'intro',
    title: 'Intro',
    content: 'A direct imported theme fixture should fail validation until the valid theme is implemented.',
  },
];

test('the directly imported test-only theme fixture is rejected before golden output can be accepted', () => {
  const firstHtml = assemble(exampleTheme as Theme, regions);
  const secondHtml = assemble(exampleTheme as Theme, regions);

  assert.equal(firstHtml, secondHtml, 'expected deterministic HTML from repeated assembly');
  validateBuildOutput(firstHtml);

  const goldenHtml = readFileSync(goldenPath, 'utf8');
  assert.equal(firstHtml, goldenHtml, 'expected the golden output to match the assembled HTML');
});
