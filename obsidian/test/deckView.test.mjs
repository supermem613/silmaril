import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

const buildDirectory = new URL('../.build/', import.meta.url);
const harnessUrl = new URL('deckViewHarness.mjs', buildDirectory);

const obsidianMock = `
export class FileSystemAdapter {}
export class ItemView {
  constructor(leaf) {
    this.app = leaf.app;
    this.contentEl = leaf.contentEl;
  }
  registerEvent(eventRef) {
    return eventRef;
  }
  registerDomEvent(element, eventName, handler) {
    element.addEventListener(eventName, handler);
  }
}
export class MarkdownView {}
export class Notice {
  constructor(message) {
    globalThis.__silmarilNotices.push(message);
  }
}
export class WorkspaceLeaf {}
`;

await mkdir(buildDirectory, { recursive: true });
await build({
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outfile: fileURLToPath(harnessUrl),
  stdin: {
    contents: `
      import { FileSystemAdapter } from 'obsidian';
      import { SilmarilDeckView, slideStateForCursorLine } from './src/deckView.ts';
      export { FileSystemAdapter, SilmarilDeckView, slideStateForCursorLine };
    `,
    loader: 'ts',
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  plugins: [
    {
      name: 'obsidian-test-double',
      setup(buildContext) {
        buildContext.onResolve({ filter: /^obsidian$/ }, () => ({
          path: 'obsidian',
          namespace: 'obsidian-test-double',
        }));
        buildContext.onLoad(
          { filter: /.*/, namespace: 'obsidian-test-double' },
          () => ({
            contents: obsidianMock,
            loader: 'js',
          }),
        );
      },
    },
  ],
});

const { FileSystemAdapter, SilmarilDeckView, slideStateForCursorLine } =
  await import(
    `${pathToFileURL(fileURLToPath(harnessUrl)).href}?test=${Date.now()}`
  );

class TestAdapter extends FileSystemAdapter {
  blockWrites = false;
  files = new Map();
  directories = new Set();
  pendingWrites = [];

  async exists(filePath) {
    return this.files.has(filePath) || this.directories.has(filePath);
  }

  async mkdir(directory) {
    this.directories.add(directory);
  }

  async remove(filePath) {
    this.files.delete(filePath);
  }

  async write(filePath, content) {
    if (this.blockWrites) {
      await new Promise((resolve) => {
        this.pendingWrites.push(resolve);
      });
    }
    this.files.set(filePath, content);
  }

  releaseNextWrite() {
    const resolve = this.pendingWrites.shift();
    assert.notEqual(resolve, undefined);
    resolve();
  }

  getFullPath(filePath) {
    return `C:\\vault\\${filePath}`;
  }

  getResourcePath(filePath) {
    return `app://vault/${filePath}`;
  }
}

function createContentElement() {
  const children = [];
  return {
    children,
    classList: {
      add() {},
    },
    replaceChildren() {
      children.length = 0;
    },
    append(child) {
      children.push(child);
    },
  };
}

function createWorkspace() {
  const handlers = new Map();
  return {
    on(eventName, handler) {
      const eventHandlers = handlers.get(eventName) ?? [];
      eventHandlers.push(handler);
      handlers.set(eventName, eventHandlers);
      return { eventName, handler };
    },
    emit(eventName, ...args) {
      for (const handler of handlers.get(eventName) ?? []) {
        handler(...args);
      }
    },
  };
}

function createSourceView(path, markdown) {
  let cursorLine = 0;
  return {
    editor: {
      getValue: () => markdown,
      getCursor: () => ({ line: cursorLine, ch: 0 }),
      setCursorLine(line) {
        cursorLine = line;
      },
    },
    file: { path },
    async save() {},
  };
}

async function pollFor(label, condition) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail(`Timed out waiting for ${label}.`);
}

test('refreshes after paint, restores the active slide, and keeps focus changes on the loaded deck', async () => {
  const scheduled = new Map();
  const navigations = [];
  const windowHandlers = new Map();
  let nextTimerId = 1;

  globalThis.__silmarilNotices = [];
  const contentEl = createContentElement();
  const iframeElements = [];
  globalThis.window = {
    addEventListener(eventName, handler) {
      const handlers = windowHandlers.get(eventName) ?? [];
      handlers.push(handler);
      windowHandlers.set(eventName, handlers);
    },
    dispatchMessage(source, data) {
      for (const handler of windowHandlers.get('message') ?? []) {
        handler({ source, data });
      }
    },
    setTimeout(callback) {
      const id = nextTimerId;
      nextTimerId += 1;
      scheduled.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      scheduled.delete(id);
    },
  };
  globalThis.document = {
    addEventListener() {},
    createElement(tagName) {
      assert.equal(tagName, 'iframe');
      const loadHandlers = [];
      const postedMessages = [];
      let source = '';
      const iframe = {
        addEventListener(eventName, handler) {
          if (eventName === 'load') {
            loadHandlers.push(handler);
          }
        },
        dispatchLoad() {
          for (const handler of loadHandlers.splice(0)) {
            handler();
          }
        },
        contentWindow: {
          postMessage(message, targetOrigin) {
            postedMessages.push({ message, targetOrigin });
          },
          postedMessages,
        },
        focus() {},
        remove() {
          const index = contentEl.children.indexOf(iframe);
          if (index !== -1) {
            contentEl.children.splice(index, 1);
          }
        },
        replaceWith(replacement) {
          const index = contentEl.children.indexOf(iframe);
          assert.notEqual(index, -1);
          contentEl.children[index] = replacement;
        },
        setAttribute() {},
        set className(_value) {},
        set title(_value) {},
        get src() {
          return source;
        },
        set src(value) {
          source = value;
          navigations.push(value);
        },
      };
      iframeElements.push(iframe);
      return iframe;
    },
  };

  const adapter = new TestAdapter();
  const workspace = createWorkspace();
  let sourceView = createSourceView('deck.md', '# Deck\n\n## First\n\nContent');
  const leaf = {
    app: {
      vault: {
        adapter,
        configDir: '.obsidian',
      },
      workspace,
    },
    contentEl,
  };
  const view = new SilmarilDeckView(leaf, () => sourceView);

  const runScheduledRender = async () => {
    const callbacks = [...scheduled.values()];
    scheduled.clear();
    for (const callback of callbacks) {
      callback();
    }
    await new Promise((resolve) => setImmediate(resolve));
  };

  await view.onOpen();
  await runScheduledRender();
  await pollFor('the first preview navigation', () => navigations.length === 1);
  const initialIframe = contentEl.children[0];
  initialIframe.dispatchLoad();
  globalThis.window.dispatchMessage(initialIframe.contentWindow, {
    type: 'silmaril-preview-state',
    slideId: 'second-slide',
    slideIndex: 2,
  });

  workspace.emit('editor-change', sourceView.editor, sourceView);
  await runScheduledRender();
  await pollFor('the refreshed preview navigation', () => navigations.length === 2);
  const pendingIframe = iframeElements[1];
  assert.deepEqual(
    contentEl.children,
    [initialIframe, pendingIframe],
    'the loaded deck must remain visible while its replacement loads',
  );
  pendingIframe.dispatchLoad();
  assert.deepEqual(
    contentEl.children,
    [initialIframe, pendingIframe],
    'the loaded deck must remain visible until the replacement paints',
  );
  globalThis.window.dispatchMessage(pendingIframe.contentWindow, {
    type: 'silmaril-preview-ready',
    slideId: 'overview',
    slideIndex: 0,
  });
  assert.deepEqual(pendingIframe.contentWindow.postedMessages, [
    {
      message: {
        type: 'silmaril-preview-restore',
        slideId: 'second-slide',
        slideIndex: 2,
      },
      targetOrigin: '*',
    },
  ]);
  assert.deepEqual(
    contentEl.children,
    [initialIframe, pendingIframe],
    'the loaded deck must remain visible while the replacement restores its slide',
  );
  globalThis.window.dispatchMessage(pendingIframe.contentWindow, {
    type: 'silmaril-preview-ready',
    slideId: 'second-slide',
    slideIndex: 2,
  });
  assert.notEqual(
    contentEl.children[0],
    initialIframe,
    'refreshing a deck must navigate a fresh iframe element',
  );
  assert.equal(iframeElements.length, 2);

  adapter.blockWrites = true;
  workspace.emit('editor-change', sourceView.editor, sourceView);
  await runScheduledRender();
  workspace.emit('editor-change', sourceView.editor, sourceView);
  await runScheduledRender();
  assert.equal(adapter.pendingWrites.length, 1);

  adapter.releaseNextWrite();
  await pollFor(
    'the first overlapping preview publication',
    () => iframeElements.length === 3 && adapter.pendingWrites.length === 1,
  );
  const stalePendingIframe = iframeElements[2];
  adapter.releaseNextWrite();
  await pollFor(
    'the latest overlapping preview publication',
    () => iframeElements.length === 4,
  );
  adapter.blockWrites = false;
  const latestPendingIframe = iframeElements[3];
  assert.deepEqual(
    contentEl.children,
    [pendingIframe, latestPendingIframe],
    'a newer refresh must cancel and remove an older pending iframe',
  );
  assert.equal(contentEl.children.includes(stalePendingIframe), false);
  globalThis.window.dispatchMessage(latestPendingIframe.contentWindow, {
    type: 'silmaril-preview-ready',
    slideId: 'second-slide',
    slideIndex: 2,
  });

  workspace.emit('active-leaf-change');
  await runScheduledRender();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    navigations.length,
    4,
    'focusing the unchanged source note must preserve the loaded preview',
  );

  sourceView = createSourceView('other.md', '# Other\n\n## Slide\n\nChanged');
  workspace.emit('active-leaf-change');
  await runScheduledRender();
  await pollFor('the changed source preview navigation', () => navigations.length === 5);
  globalThis.window.dispatchMessage(iframeElements[4].contentWindow, {
    type: 'silmaril-preview-ready',
    slideId: 'second-slide',
    slideIndex: 2,
  });

  await view.onClose();
  assert.deepEqual(globalThis.__silmarilNotices, []);
});

test('maps a cursor line to the slide that owns it', () => {
  const deck = [
    '# Deck', // 0
    '', // 1
    '## First', // 2
    '', // 3
    'Alpha', // 4
    '', // 5
    '## Second', // 6
    '', // 7
    'Beta', // 8
  ].join('\n');

  assert.deepEqual(slideStateForCursorLine(deck, 0), {
    slideId: 'overview',
    slideIndex: 0,
  });
  assert.deepEqual(slideStateForCursorLine(deck, 2), {
    slideId: 'first',
    slideIndex: 1,
  });
  assert.deepEqual(slideStateForCursorLine(deck, 4), {
    slideId: 'first',
    slideIndex: 1,
  });
  assert.deepEqual(slideStateForCursorLine(deck, 6), {
    slideId: 'second',
    slideIndex: 2,
  });
  assert.deepEqual(slideStateForCursorLine(deck, 8), {
    slideId: 'second',
    slideIndex: 2,
  });
});

test('navigates the loaded preview to the slide under the editor cursor', async () => {
  const scheduled = new Map();
  const navigations = [];
  const windowHandlers = new Map();
  const documentHandlers = new Map();
  let nextTimerId = 1;

  globalThis.__silmarilNotices = [];
  const contentEl = createContentElement();
  const iframeElements = [];
  globalThis.window = {
    addEventListener(eventName, handler) {
      const handlers = windowHandlers.get(eventName) ?? [];
      handlers.push(handler);
      windowHandlers.set(eventName, handlers);
    },
    dispatchMessage(source, data) {
      for (const handler of windowHandlers.get('message') ?? []) {
        handler({ source, data });
      }
    },
    setTimeout(callback) {
      const id = nextTimerId;
      nextTimerId += 1;
      scheduled.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      scheduled.delete(id);
    },
  };
  globalThis.document = {
    addEventListener(eventName, handler) {
      const handlers = documentHandlers.get(eventName) ?? [];
      handlers.push(handler);
      documentHandlers.set(eventName, handlers);
    },
    dispatchSelectionChange() {
      for (const handler of documentHandlers.get('selectionchange') ?? []) {
        handler({});
      }
    },
    createElement(tagName) {
      assert.equal(tagName, 'iframe');
      const postedMessages = [];
      const iframe = {
        addEventListener() {},
        contentWindow: {
          postMessage(message, targetOrigin) {
            postedMessages.push({ message, targetOrigin });
          },
          postedMessages,
        },
        focus() {},
        remove() {
          const index = contentEl.children.indexOf(iframe);
          if (index !== -1) {
            contentEl.children.splice(index, 1);
          }
        },
        setAttribute() {},
        set className(_value) {},
        set title(_value) {},
        get src() {
          return '';
        },
        set src(value) {
          navigations.push(value);
        },
      };
      iframeElements.push(iframe);
      return iframe;
    },
  };

  const adapter = new TestAdapter();
  const workspace = createWorkspace();
  const sourceView = createSourceView(
    'deck.md',
    ['# Deck', '', '## First', '', 'Alpha', '', '## Second', '', 'Beta'].join(
      '\n',
    ),
  );
  const leaf = {
    app: {
      vault: { adapter, configDir: '.obsidian' },
      workspace,
    },
    contentEl,
  };
  const view = new SilmarilDeckView(leaf, () => sourceView);

  const runScheduledRender = async () => {
    const callbacks = [...scheduled.values()];
    scheduled.clear();
    for (const callback of callbacks) {
      callback();
    }
    await new Promise((resolve) => setImmediate(resolve));
  };

  await view.onOpen();
  await runScheduledRender();
  await pollFor('the first preview navigation', () => navigations.length === 1);
  const activeIframe = iframeElements[0];
  globalThis.window.dispatchMessage(activeIframe.contentWindow, {
    type: 'silmaril-preview-state',
    slideId: 'overview',
    slideIndex: 0,
  });

  sourceView.editor.setCursorLine(6);
  globalThis.document.dispatchSelectionChange();
  await runScheduledRender();

  assert.deepEqual(activeIframe.contentWindow.postedMessages, [
    {
      message: {
        type: 'silmaril-preview-restore',
        slideId: 'second',
        slideIndex: 2,
      },
      targetOrigin: '*',
    },
  ]);

  globalThis.window.dispatchMessage(activeIframe.contentWindow, {
    type: 'silmaril-preview-state',
    slideId: 'second',
    slideIndex: 2,
  });
  globalThis.document.dispatchSelectionChange();
  await runScheduledRender();
  assert.equal(
    activeIframe.contentWindow.postedMessages.length,
    1,
    'a cursor still inside the active slide must not re-navigate the preview',
  );

  await view.onClose();
  assert.deepEqual(globalThis.__silmarilNotices, []);
});
