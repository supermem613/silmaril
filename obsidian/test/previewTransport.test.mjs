import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

import { createPreviewTransport } from '../src/previewTransport.ts';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

test('initializes the generated deck through the production preview transport under a host CSP without unsafe-inline', async () => {
  const { renderPresentationFromMarkdown } = await import(
    pathToFileURL(path.join(repoRoot, 'dist', 'pipeline', 'renderFile.js')).href
  );
  const sourcePath = path.join(repoRoot, 'fixtures', 'perf', 'big-talk.md');
  const markdown = await readFile(sourcePath, 'utf8');
  const { html } = renderPresentationFromMarkdown(markdown, sourcePath);
  const previewDirectory = await mkdtemp(
    path.join(tmpdir(), 'silmaril-preview-transport-'),
  );
  const transport = createPreviewTransport({
    directory: previewDirectory,
    fileSystem: { mkdir, rm, writeFile },
    toFileUrl: (filePath) => pathToFileURL(filePath).href,
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
      `assertion failure: expected the child frame's active step data-id to equal 'overview' but it was ${activeStep ?? 'null/absent'}, because the stub transport serves the deck from a non-file opaque-origin URL whose inline scripts are blocked by script-src 'self', leaving no .step.active\nconsole errors:\n${consoleErrors.join('\n') || '(none)'}`,
    );
    assert.deepEqual(consoleErrors, [], `expected no console errors but saw:\n${consoleErrors.join('\n') || '(none)'}`);
  } finally {
    await transport.dispose();
    await browser.close();
    await rm(previewDirectory, { recursive: true, force: true });
  }
});
