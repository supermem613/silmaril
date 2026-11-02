import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

import type { TFile } from 'obsidian';

import { createWikiImageResolver, renderDeck } from '../src/renderAdapter';
import { renderPresentationFromMarkdownAsync } from '../../src/pipeline/renderFile';

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

test('native pasted-image embeds resolve vault attachments in preview and publish', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'silmaril-wiki-image-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = join(directory, 'talks', 'deck.md');
  const imagePath = join(directory, 'attachments', 'Pasted image 20261101201345.png');
  await mkdir(dirname(sourcePath), { recursive: true });
  await mkdir(dirname(imagePath), { recursive: true });
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  await writeFile(imagePath, image);
  const resolveWikiImage = () => encodeURIComponent(relative(dirname(sourcePath), imagePath));
  const markdown = '## Working\n\n![[Pasted image 20261101201345.png]]';
  const results = [
    await renderDeck(markdown, sourcePath, resolveWikiImage),
    await renderPresentationFromMarkdownAsync(markdown, sourcePath, { resolveWikiImage }),
  ];
  const expected = `<img src="data:image/png;base64,${image.toString('base64')}" alt="Pasted image 20261101201345.png">`;

  assert.deepEqual(results.map(({ html }) => html.match(/<img [^>]+>/)?.[0]), [expected, expected]);
});

test('native image sizes use the vault lookup and preserve encoded attachment paths', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'silmaril-wiki-image-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourceVaultPath = 'talks/deck.md';
  const imageVaultPath = 'attachments/Images #100% (draft)/Flow.svg';
  const sourcePath = join(directory, sourceVaultPath);
  const imagePath = join(directory, imageVaultPath);
  await mkdir(dirname(imagePath), { recursive: true });
  const image = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="red"/></svg>';
  await writeFile(imagePath, image);
  const lookups: Array<[string, string]> = [];
  const resolveWikiImage = createWikiImageResolver({
    getFirstLinkpathDest: (reference, source) => {
      lookups.push([reference, source]);
      return { path: imageVaultPath } as TFile;
    },
  }, {
    getFullPath: (path) => join(directory, path),
  }, sourceVaultPath);
  const result = await renderDeck('## Flow\n\n![[Flow.svg|200x100]]', sourcePath, resolveWikiImage);

  assert.deepEqual({
    image: result.html.match(/<img [^>]+>/)?.[0],
    lookups,
  }, {
    image: `<img src="data:image/svg+xml;base64,${Buffer.from(image).toString('base64')}" alt="Flow.svg" width="200" height="100">`,
    lookups: [['Flow.svg', sourceVaultPath]],
  });
});

test('native aliases and widths coexist with Markdown images and literal code examples', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'silmaril-wiki-image-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const image = '<svg xmlns="http://www.w3.org/2000/svg"/>';
  await writeFile(join(directory, 'Flow.svg'), image);
  const lookups: string[] = [];
  const resolveWikiImage = (reference: string) => {
    lookups.push(reference);
    return 'Flow.svg';
  };
  const markdown = [
    '## Syntax',
    '![[Flow.svg|Flow & <detail>]]',
    '![[Flow.svg|200]]',
    '![Standard](Flow.svg)',
    '\\![[Escaped.svg]]',
    '`![[Inline.svg]]`',
    '```\n![[Fenced.svg]]\n```',
    '    ![[Indented.svg]]',
    '![[Article.md]]',
  ].join('\n\n');
  const { html } = await renderDeck(markdown, join(directory, 'deck.md'), resolveWikiImage);
  const source = `data:image/svg+xml;base64,${Buffer.from(image).toString('base64')}`;

  assert.deepEqual(html.match(/<img [^>]+>/g), [
    `<img src="${source}" alt="Flow &amp; &lt;detail&gt;">`,
    `<img src="${source}" alt="Flow.svg" width="200">`,
    `<img src="${source}" alt="Standard">`,
  ]);
  assert.deepEqual(lookups, ['Flow.svg', 'Flow.svg']);
  assert.ok(html.includes('<p>![[Escaped.svg]]</p>'));
  assert.ok(html.includes('<code>![[Inline.svg]]</code>'));
  assert.ok(html.includes('<pre><code>![[Fenced.svg]]\n</code></pre>'));
  assert.ok(html.includes('<pre><code>![[Indented.svg]]\n</code></pre>'));
  assert.ok(html.includes('<p>![[Article.md]]</p>'));
});

test('unresolved native images report the image and source note', async () => {
  const directory = tmpdir();
  const resolveWikiImage = createWikiImageResolver({
    getFirstLinkpathDest: () => null,
  }, {
    getFullPath: (path) => join(directory, path),
  }, 'talks/deck.md');

  await assert.rejects(
    renderDeck('## Missing\n\n![[Missing.png]]', join(directory, 'talks', 'deck.md'), resolveWikiImage),
    { message: 'Unable to find image "Missing.png" from "talks/deck.md".' },
  );
});
