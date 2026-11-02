import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

await import('../esbuild.mjs');
const { renderDeck } = await import('../.build/renderAdapter.mjs');

const paragraph = 'Traffic moves through the gateway, API, queue, and worker. '.repeat(4);
const denseBody = Array.from({ length: 18 }, () => paragraph).join('\n\n');

async function renderImageDeck(markdown, image) {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    response.end(image);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const source = `http://127.0.0.1:${server.address().port}/image.svg`;
    return await renderDeck(markdown.replaceAll('IMAGE_URL', source), 'fit.md');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('fits every paragraph inside an overflowing slide without changing its frame', async () => {
  const { html } = await renderDeck(`## Request path\n\n${denseBody}\n\n## Normal\n\nShort text.`, 'fit.md');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(html);
    await page.waitForFunction(() => document.querySelector('.step.active'));
    const sizes = await page.locator('.engineering-card').first().evaluate((card) => ({
      width: card.clientWidth,
      height: card.clientHeight,
      contentWidth: card.scrollWidth,
      contentHeight: card.scrollHeight,
    }));

    assert.ok(sizes.contentWidth <= sizes.width && sizes.contentHeight <= sizes.height, JSON.stringify(sizes));
    const typography = await page.evaluate(() => Array.from(
      document.querySelectorAll('.engineering-card'),
      (card) => ({
        scale: Number(card.dataset.slideFit),
        body: parseFloat(getComputedStyle(card).fontSize),
        heading: parseFloat(getComputedStyle(card.querySelector('h2')).fontSize),
        gap: parseFloat(getComputedStyle(card).rowGap),
        width: card.offsetWidth,
        height: card.offsetHeight,
        maximumHeight: parseFloat(getComputedStyle(card).maxHeight),
        paragraphs: card.querySelectorAll('p').length,
      }),
    ));
    assert.ok(typography[0].scale > 0 && typography[0].scale < 1);
    assert.ok(typography[0].body < typography[1].body && typography[0].heading < typography[1].heading);
    assert.ok(typography[0].gap < typography[1].gap);
    assert.equal(typography[0].width, typography[1].width);
    assert.equal(typography[0].height, typography[0].maximumHeight);
    assert.equal(typography[0].paragraphs, 18);
    assert.equal(typography[1].scale, 1);
  } finally {
    await browser.close();
  }
});

test('refits changed content and restores normal typography when content becomes short', async () => {
  const { html } = await renderDeck('## Editable\n\nShort text.', 'fit.md');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    await page.waitForFunction(() => document.querySelector('.engineering-card[data-slide-fit]'));
    const originalFont = await page.locator('.engineering-card').evaluate((card) => getComputedStyle(card).fontSize);
    await page.evaluate((paragraph) => {
      const body = document.querySelector('[data-slide-content]');
      body.replaceChildren(...Array.from({ length: 18 }, () => {
        const element = document.createElement('p');
        element.textContent = paragraph;
        return element;
      }));
    }, paragraph);
    await page.waitForFunction(() => {
      const card = document.querySelector('.engineering-card');
      return card.scrollHeight <= card.clientHeight && Number(card.dataset.slideFit) < 1;
    });
    await page.evaluate(() => {
      document.querySelector('.engineering-card').style.fontFamily = 'monospace';
      document.fonts.dispatchEvent(new Event('loadingdone'));
    });
    await page.waitForFunction(() => {
      const card = document.querySelector('.engineering-card');
      return card.scrollHeight <= card.clientHeight;
    });
    await page.evaluate(() => {
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Short text again.';
      document.querySelector('[data-slide-content]').replaceChildren(paragraph);
    });
    await page.waitForFunction(() => document.querySelector('.engineering-card').dataset.slideFit === '1');
    assert.equal(await page.locator('.engineering-card').evaluate((card) => getComputedStyle(card).fontSize), originalFont);
  } finally {
    await browser.close();
  }
});

test('fits wide code, tables, columns, and media across responsive layout changes', async () => {
  const image = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="2000"><rect width="100" height="2000" fill="red"/></svg>';
  const bodies = [
    `\`\`\`js\nconst payload = "${'gateway'.repeat(200)}";\n\`\`\``,
    `| Field | Value |\n| --- | --- |\n${Array.from({ length: 12 }, (_, index) => `| ${index} | ${paragraph} |`).join('\n')}`,
    `:::columns\n${denseBody}\n\n---\n\n${denseBody}\n:::`,
    `${paragraph}\n\n![One](IMAGE_URL)\n\n![Two](IMAGE_URL)\n\n![Three](IMAGE_URL)\n\n\`\`\`mermaid\nflowchart TD\nA --> B\nB --> C\nC --> D\n\`\`\``,
  ];
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const body of bodies) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const { html } = await renderImageDeck(`## Content\n\n${body}`, image);
      await page.setContent(html);
      await page.locator('img').evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
      if (body.includes('IMAGE_URL')) {
        assert.equal(await page.locator('img').count(), 3);
      }
      const scales = [];
      for (const width of [1280, 390, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        await page.waitForFunction(() => {
          const card = document.querySelector('.engineering-card');
          return Number(card.dataset.slideFit) > 0 &&
            [card, ...card.querySelectorAll('pre, table')].every((element) =>
              element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth);
        });
        scales.push(await page.locator('.engineering-card').evaluate((card) => card.dataset.slideFit));
        if (body.startsWith(':::columns')) {
          assert.equal(await page.locator('.columns').evaluate((columns) => getComputedStyle(columns).flexDirection),
            width === 390 ? 'column' : 'row');
        }
      }
      assert.equal(scales[2], scales[0]);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('refits after image source changes finish loading', async () => {
  const small = '<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="1"/>';
  const tall = `data:image/svg+xml;base64,${Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="4000"/>',
  ).toString('base64')}`;
  const { html } = await renderImageDeck('## Images\n\n![One](IMAGE_URL)\n\n![Two](IMAGE_URL)\n\n![Three](IMAGE_URL)', small);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    await page.waitForFunction(() => document.querySelector('.engineering-card').dataset.slideFit === '1');
    await page.locator('img').evaluateAll(async (images, source) => {
      for (const image of images) {
        image.src = source;
      }
      await Promise.all(images.map((image) => image.decode()));
    }, tall);
    await page.waitForFunction(() => {
      const card = document.querySelector('.engineering-card');
      return card.scrollHeight <= card.clientHeight && Number(card.dataset.slideFit) > 0;
    });
    assert.deepEqual(await page.locator('img').evaluateAll((images) => images.map((image) => ({
      width: image.naturalWidth,
      height: image.naturalHeight,
      fit: getComputedStyle(image).objectFit,
    }))), Array.from({ length: 3 }, () => ({ width: 100, height: 4000, fit: 'contain' })));
  } finally {
    await browser.close();
  }
});

test('keeps content readable and scrollable when structural borders alone exceed the frame', async () => {
  const table = `| Row |\n| --- |\n${Array.from({ length: 1000 }, (_, index) => `| Row ${index} |`).join('\n')}`;
  const { html } = await renderDeck(`## Dense table\n\n${table}`, 'fit.md');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    await page.waitForFunction(() => document.querySelector('.engineering-card[data-slide-fit="overflow"]'));
    const state = await page.locator('.engineering-card').evaluate((card) => ({
      overflow: getComputedStyle(card).overflow,
      scrollable: card.scrollHeight > card.clientHeight,
      finalRow: card.querySelector('tbody tr:last-child').textContent.trim(),
    }));
    assert.deepEqual(state, { overflow: 'auto', scrollable: true, finalRow: 'Row 999' });
  } finally {
    await browser.close();
  }
});
