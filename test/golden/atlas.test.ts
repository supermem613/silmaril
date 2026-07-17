import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assemble } from '../../src/pipeline/assemble.js';
import { getTheme } from '../../src/theme/registry.js';

test('renders the accepted atlas presentation', () => {
  const expected = readFileSync(
    fileURLToPath(new URL('./atlas.html', import.meta.url)),
    'utf8',
  );
  const regions = [
    { id: 'overview', title: 'The whole map', content: 'Begin with the broad terrain.' },
    { id: 'north', title: 'Northern route', content: 'Cross the ridge and follow the river.' },
    { id: 'south', title: 'Southern route', content: 'Trace the coast and gather the signal.' },
  ];
  const theme = getTheme('atlas');
  const first = assemble(theme, regions);
  const second = assemble(theme, regions);

  assert.equal(
    first,
    expected,
    'The atlas theme is unavailable, so the atlas golden assertion fails for the named missing behavior.',
  );
  assert.equal(
    second,
    expected,
    'The atlas theme is unavailable, so the atlas golden assertion fails for the named missing behavior.',
  );
});
