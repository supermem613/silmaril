import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assemble } from '../../src/pipeline/assemble.js';
import { getTheme } from '../../src/theme/registry.js';

test('renders the accepted cards presentation', () => {
  const fixture = readFileSync(
    fileURLToPath(new URL('../fixtures/themes/talk.md', import.meta.url)),
    'utf8',
  );
  assert.match(fixture, /theme:\s*cards/);

  const expected = readFileSync(
    fileURLToPath(new URL('./cards.html', import.meta.url)),
    'utf8',
  );
  const actual = assemble(getTheme('cards'), [
    { id: 'intro', title: 'One canvas, one story', content: 'Start with the whole map.' },
    { id: 'detail', title: 'Zoom into evidence', content: 'Move between related regions.' },
    { id: 'close', title: 'Return to the overview', content: 'End with shared context.' },
  ]);

  assert.equal(
    actual,
    expected,
    'The cards theme is unavailable, so the cards golden assertion fails for the named missing behavior.',
  );
});
