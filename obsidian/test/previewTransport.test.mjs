import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

import { createPreviewTransport } from '../src/previewTransport.ts';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const pluginRoot = path.resolve(import.meta.dirname, '..');

test('initializes the generated deck with an offline image through the production preview transport under a host CSP without unsafe-inline', async (t) => {
  await import(pathToFileURL(path.join(pluginRoot, 'esbuild.mjs')).href);
  const { renderDeck } = await import(
    pathToFileURL(path.join(pluginRoot, '.build', 'renderAdapter.mjs')).href
  );
  const sourcePath = path.join(repoRoot, 'fixtures', 'perf', 'big-talk.md');
  const subtitle = 'How requests move from the gateway to storage';
  const image = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>';
  const imageServer = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    response.end(image);
  });
  const closeImageServer = () => new Promise((resolve) => imageServer.close(resolve));
  t.after(() => imageServer.listening ? closeImageServer() : undefined);
  await new Promise((resolve) => imageServer.listen(0, '127.0.0.1', resolve));
  const { port } = imageServer.address();
  const source = (await readFile(sourcePath, 'utf8')).replace(/^(# .+)$/m, `$1\n\n${subtitle}`);
  const imageDirectory = await mkdtemp(path.join(tmpdir(), 'silmaril-vault-images-'));
  t.after(() => rm(imageDirectory, { recursive: true, force: true }));
  await writeFile(path.join(imageDirectory, 'Pasted image.png'), Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ));
  await writeFile(path.join(imageDirectory, 'Diagram.svg'), image);
  const resolveWikiImage = (reference) => encodeURIComponent(
    path.relative(path.dirname(sourcePath), path.join(imageDirectory, reference)),
  );
  const markdown = `${source}\n\n## Remote image\n\n![Offline image](http://127.0.0.1:${port}/image)\n\n## Vault images\n\n![[Pasted image.png]]\n\n![[Diagram.svg|200x100]]`;
  const { html } = await renderDeck(markdown, sourcePath, resolveWikiImage);
  await closeImageServer();
  await rm(imageDirectory, { recursive: true, force: true });
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
    await childFrame.waitForFunction(() => {
      const image = document.querySelector('img[alt="Offline image"]');
      return image?.complete && image.naturalWidth > 0;
    });
    const imageSize = await childFrame.evaluate(() => {
      const image = document.querySelector('img[alt="Offline image"]');
      return { width: image.naturalWidth, height: image.naturalHeight };
    });
    assert.deepEqual(imageSize, { width: 4, height: 4 });
    await childFrame.waitForFunction(() => ['Pasted image.png', 'Diagram.svg'].every((alt) => {
      const image = document.querySelector(`img[alt="${alt}"]`);
      return image?.complete && image.naturalWidth > 0;
    }));
    const vaultImages = await childFrame.evaluate(() => ['Pasted image.png', 'Diagram.svg'].map((alt) => {
      const image = document.querySelector(`img[alt="${alt}"]`);
      return {
        alt,
        width: image.naturalWidth,
        height: image.naturalHeight,
        displayWidth: image.getAttribute('width'),
        displayHeight: image.getAttribute('height'),
      };
    }));
    assert.deepEqual(vaultImages, [
      { alt: 'Pasted image.png', width: 1, height: 1, displayWidth: null, displayHeight: null },
      { alt: 'Diagram.svg', width: 4, height: 4, displayWidth: '200', displayHeight: '100' },
    ]);
    const heading = await childFrame.evaluate(() => ({
      subtitle: document.querySelector('#overview .engineering-board-subtitle').textContent,
      bottom: document.querySelector('.engineering-board-title').getBoundingClientRect().bottom,
      cardTop: Math.min(...Array.from(document.querySelectorAll('.engineering-card'),
        (card) => card.getBoundingClientRect().top)),
    }));
    assert.equal(heading.subtitle, subtitle);
    assert.ok(heading.bottom <= heading.cardTop, JSON.stringify(heading));
    assert.deepEqual(consoleErrors, [], `expected no console errors but saw:\n${consoleErrors.join('\n') || '(none)'}`);
  } finally {
    await transport.dispose();
    await browser.close();
    await rm(previewDirectory, { recursive: true, force: true });
  }
});

test('keeps a wrapping deck subtitle above the cards and preserves focused-slide navigation', async () => {
  await import(pathToFileURL(path.join(pluginRoot, 'esbuild.mjs')).href);
  const { renderDeck } = await import(
    pathToFileURL(path.join(pluginRoot, '.build', 'renderAdapter.mjs')).href
  );
  const subtitle = [
    'How requests move from the gateway through validation, storage, and recovery.',
    'This architecture review covers service boundaries, failure handling, and safe retries.',
    'It also includes a long identifier:',
    'architecture'.repeat(40),
  ].join(' ');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    const page = await browser.newPage();
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      for (const slideCount of [1, 5, 12]) {
        const markdown = `# Deck\n\n${subtitle}\n\n${Array.from(
          { length: slideCount },
          (_, index) => `## Slide ${index + 1}\n\nBody`,
        ).join('\n\n')}`;
        const { html } = await renderDeck(markdown, path.join(repoRoot, 'subtitle.md'));
        await page.setContent(html);
        await page.waitForFunction(() => document.querySelector('#overview.active'));
        const geometry = await page.evaluate(() => {
          const heading = document.querySelector('.engineering-board-title');
          const subtitle = document.querySelector('.engineering-board-subtitle');
          const title = heading.querySelector('h1');
          const muted = document.createElement('span');
          muted.style.color = getComputedStyle(document.documentElement).getPropertyValue('--muted');
          return {
            text: subtitle.textContent,
            heading: heading.getBoundingClientRect().toJSON(),
            subtitle: subtitle.getBoundingClientRect().toJSON(),
            cardTop: Math.min(...Array.from(document.querySelectorAll('.engineering-card'),
              (card) => card.getBoundingClientRect().top)),
            wraps: subtitle.clientHeight > parseFloat(getComputedStyle(subtitle).lineHeight),
            fits: subtitle.scrollWidth <= subtitle.clientWidth,
            fontSize: parseFloat(getComputedStyle(subtitle).fontSize),
            titleFontSize: parseFloat(getComputedStyle(title).fontSize),
            color: getComputedStyle(subtitle).color,
            mutedColor: muted.style.color,
          };
        });
        assert.equal(geometry.text, subtitle);
        assert.ok(geometry.wraps && geometry.fits, JSON.stringify(geometry));
        assert.ok(geometry.heading.top >= 0 && geometry.heading.bottom <= geometry.cardTop,
          JSON.stringify({ viewport, slideCount, geometry }));
        assert.ok(geometry.subtitle.right <= viewport.width, JSON.stringify(geometry));
        assert.ok(geometry.fontSize < geometry.titleFontSize, JSON.stringify(geometry));
        assert.equal(geometry.color, geometry.mutedColor);
        assert.equal(await page.title(), 'Deck');

        await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
        const colors = await page.evaluate(() => {
          const muted = document.createElement('span');
          muted.style.color = getComputedStyle(document.documentElement).getPropertyValue('--muted');
          return {
            actual: getComputedStyle(document.querySelector('.engineering-board-subtitle')).color,
            expected: muted.style.color,
          };
        });
        assert.equal(colors.actual, colors.expected);

        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => document.querySelector('#slide-1.active.present'));
        assert.equal(await page.locator('.step.active .engineering-card h2').textContent(), 'Slide 1');
        assert.equal(await page.locator('#overview').evaluate((step) => getComputedStyle(step).visibility), 'hidden');
        await page.evaluate(() => window.impress().goto('overview'));
        await page.waitForFunction(() => document.querySelector('#overview.active.present'));
        assert.equal(await page.locator('#overview .engineering-board-subtitle').textContent(), subtitle);
      }
    }
  } finally {
    await browser.close();
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
