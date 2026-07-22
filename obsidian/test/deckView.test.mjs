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
      import { SilmarilDeckView } from './src/deckView.ts';
      export { FileSystemAdapter, SilmarilDeckView };
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

const { FileSystemAdapter, SilmarilDeckView } = await import(
  `${pathToFileURL(fileURLToPath(harnessUrl)).href}?test=${Date.now()}`
);

class TestAdapter extends FileSystemAdapter {
  files = new Map();
  directories = new Set();

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
    this.files.set(filePath, content);
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
  return {
    editor: {
      getValue: () => markdown,
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

test('refreshes with a new iframe and keeps focus changes on the loaded deck', async () => {
  const scheduled = new Map();
  const navigations = [];
  let nextTimerId = 1;

  globalThis.__silmarilNotices = [];
  const contentEl = createContentElement();
  const iframeElements = [];
  globalThis.window = {
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
    createElement(tagName) {
      assert.equal(tagName, 'iframe');
      let source = '';
      const iframe = {
        addEventListener() {},
        focus() {},
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

  workspace.emit('editor-change', sourceView.editor, sourceView);
  await runScheduledRender();
  await pollFor('the refreshed preview navigation', () => navigations.length === 2);
  assert.notEqual(
    contentEl.children[0],
    initialIframe,
    'refreshing a deck must navigate a fresh iframe element',
  );
  assert.equal(iframeElements.length, 2);

  workspace.emit('active-leaf-change');
  await runScheduledRender();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    navigations.length,
    2,
    'focusing the unchanged source note must preserve the loaded preview',
  );

  sourceView = createSourceView('other.md', '# Other\n\n## Slide\n\nChanged');
  workspace.emit('active-leaf-change');
  await runScheduledRender();
  await pollFor('the changed source preview navigation', () => navigations.length === 3);

  await view.onClose();
  assert.deepEqual(globalThis.__silmarilNotices, []);
});
