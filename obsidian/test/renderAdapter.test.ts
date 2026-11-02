import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { renderDeck } from '../src/renderAdapter';

test('renderDeck returns html and slideCount for a multi-slide deck', async () => {
  const fixture = '# Deck\n\n## Slide One\n\nAlpha body\n\n## Slide Two\n\nBeta body';
  const sourcePath = 'deck.md';

  const result = await renderDeck(fixture, sourcePath);

  assert.equal(result.slideCount, 2);
  assert.ok(result.html.includes('id="impress"'));
  assert.ok(result.html.includes('silmaril-preview-ready'));
  assert.ok(result.html.includes('silmaril-preview-state'));
  assert.ok(result.html.includes('silmaril-preview-restore'));
});

test('renderDeck downloads and embeds remote images for the preview', async (t) => {
  const image = '<svg xmlns="http://www.w3.org/2000/svg"/>';
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    response.end(image);
  });
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const result = await renderDeck(`## Image\n\n![Preview](http://127.0.0.1:${port}/image)`, 'deck.md');

  assert.ok(result.html.includes(`<img src="data:image/svg+xml;base64,${Buffer.from(image).toString('base64')}" alt="Preview">`));
});
