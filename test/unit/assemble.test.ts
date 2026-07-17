import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { assemble } from '../../src/pipeline/assemble.js';
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
