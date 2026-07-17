import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assemble } from '../../src/pipeline/assemble.js';
import { getTheme } from '../../src/theme/registry.js';

test('renders the accepted sketch presentation', () => {
  const expected = readFileSync(
    fileURLToPath(new URL('./sketch.html', import.meta.url)),
    'utf8',
  );
  const regions = [
    { id: 'draft', title: 'First stroke', content: 'Begin with the broad gesture.' },
    { id: 'detail', title: 'Refine the line', content: 'Trace the curve and sharpen the focus.' },
    { id: 'finish', title: 'Close the sketch', content: 'End with a confident hand.' },
  ];

  const theme = getTheme('sketch');
  const first = assemble(theme, regions);
  const second = assemble(theme, regions);

  const firstBytes = Buffer.from(first, 'utf8');
  const secondBytes = Buffer.from(second, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');

  assert.equal(
    firstBytes.equals(expectedBytes),
    true,
    'The sketch theme is unavailable, so the sketch golden assertion fails for the named missing behavior.',
  );
  assert.equal(
    secondBytes.equals(expectedBytes),
    true,
    'The sketch theme is unavailable, so the sketch golden assertion fails for the named missing behavior.',
  );
  assert.match(
    expected,
    /sketch-font/i,
    'The sketch theme is unavailable, so the sketch golden assertion fails for the named missing behavior.',
  );
});
