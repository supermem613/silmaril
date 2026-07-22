import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

import { createPreviewTransport } from '../src/previewTransport.ts';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const pluginRoot = path.resolve(import.meta.dirname, '..');

test('initializes the generated deck through the production preview transport under a host CSP without unsafe-inline', async () => {
  await import(pathToFileURL(path.join(pluginRoot, 'esbuild.mjs')).href);
  const { renderDeck } = await import(
    pathToFileURL(path.join(pluginRoot, '.build', 'renderAdapter.mjs')).href
  );
  const sourcePath = path.join(repoRoot, 'fixtures', 'perf', 'big-talk.md');
  const markdown = await readFile(sourcePath, 'utf8');
  const { html } = renderDeck(markdown, sourcePath);
  const previewDirectory = await mkdtemp(
    path.join(tmpdir(), 'silmaril-preview-transport-'),
  );
  const transport = createPreviewTransport({
    directory: previewDirectory,
    fileSystem: { mkdir, rm, writeFile },
    toResourceUrl: (filePath) => pathToFileURL(filePath).href,
  });
  const transportUrl = await transport.publish(html);
  const parentPath = path.join(previewDirectory, 'parent.html');
  await writeFile(
    parentPath,
    `<!doctype html>
      <html>
        <head>
          <meta
            http-equiv="Content-Security-Policy"
            content="default-src 'self' blob: data:; script-src 'self'; style-src 'self' 'unsafe-inline'"
          >
        </head>
        <body></body>
      </html>`,
    'utf8',
  );
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(pathToFileURL(parentPath).href);
    const frameNavigation = page.waitForEvent('framenavigated', {
      predicate: (frame) =>
        frame !== page.mainFrame() && frame.url() === transportUrl,
      timeout: 30_000,
    });
    await page.evaluate((frameSrc) => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.src = frameSrc;
      document.body.append(iframe);
    }, transportUrl);
    const childFrame = await frameNavigation;
    const activeStep = await childFrame.evaluate(
      () => document.querySelector('.step.active')?.getAttribute('data-id') ?? null,
    );

    assert.equal(
      activeStep,
      'overview',
      `expected the bundled plugin renderer and preview transport to activate the overview step, but the active step was ${activeStep ?? 'null/absent'}\nconsole errors:\n${consoleErrors.join('\n') || '(none)'}`,
    );
    assert.deepEqual(consoleErrors, [], `expected no console errors but saw:\n${consoleErrors.join('\n') || '(none)'}`);
  } finally {
    await transport.dispose();
    await browser.close();
    await rm(previewDirectory, { recursive: true, force: true });
  }
});

test('uses the injected resource URL and cleans up its managed file', async () => {
  const calls = [];
  const transport = createPreviewTransport({
    directory: '.obsidian/plugins/silmaril-obsidian',
    joinPath: (directory, fileName) => `${directory}/${fileName}`,
    fileSystem: {
      async mkdir(directory) {
        calls.push(['mkdir', directory]);
      },
      async rm(filePath) {
        calls.push(['rm', filePath]);
      },
      async writeFile(filePath, html) {
        calls.push(['writeFile', filePath, html]);
      },
    },
    toResourceUrl: (filePath) => `app://vault/${filePath}?cache=1`,
  });

  const firstUrl = await transport.publish('first');
  const secondUrl = await transport.publish('second');
  await transport.dispose();

  assert.match(firstUrl, /^app:\/\/vault\/.+\?cache=1&revision=1$/);
  assert.match(secondUrl, /^app:\/\/vault\/.+\?cache=1&revision=2$/);
  assert.equal(calls.filter(([name]) => name === 'mkdir').length, 2);
  const writes = calls.filter(([name]) => name === 'writeFile');
  assert.equal(writes.length, 2);
  assert.equal(writes[0][1], writes[1][1]);
  assert.deepEqual(writes.map(([, , html]) => html), ['first', 'second']);
  const removals = calls.filter(([name]) => name === 'rm');
  assert.deepEqual(removals, [['rm', writes[0][1]]]);
});
