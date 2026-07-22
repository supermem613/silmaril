import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderDeck } from '../src/renderAdapter';

test('renderDeck returns html and slideCount for a multi-slide deck', () => {
  const fixture = '# Deck\n\n## Slide One\n\nAlpha body\n\n## Slide Two\n\nBeta body';
  const sourcePath = 'deck.md';

  const result = renderDeck(fixture, sourcePath);

  assert.equal(result.slideCount, 2);
  assert.ok(result.html.includes('id="impress"'));
  assert.ok(result.html.includes('silmaril-preview-ready'));
  assert.ok(result.html.includes('silmaril-preview-state'));
  assert.ok(result.html.includes('silmaril-preview-restore'));
});
