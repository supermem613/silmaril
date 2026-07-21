import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  FileSystemAdapter,
  ItemView,
  MarkdownView,
  Notice,
  WorkspaceLeaf,
} from 'obsidian';
import { renderDeck } from './renderAdapter.js';
import {
  createRenderScheduler,
  RenderScheduler,
  TimerSurface,
} from './renderScheduler.js';
import { createPreviewTransport } from './previewTransport.js';

export const SILMARIL_VIEW_TYPE = 'silmaril-preview';

interface RenderRequest {
  readonly requestId: number;
  readonly view: MarkdownView;
}

interface RenderResult {
  readonly requestId: number;
  readonly html: string;
}

export class SilmarilDeckView extends ItemView {
  private iframe: HTMLIFrameElement | null = null;
  private hasFocusedInitialDeck = false;
  private nextRequestId = 0;
  private readonly previewTransport = createPreviewTransport({
    directory: path.join(tmpdir(), 'silmaril-obsidian-preview'),
    fileSystem: { mkdir, rm, writeFile },
    toFileUrl: (filePath) => pathToFileURL(filePath).href,
  });
  private readonly scheduler: RenderScheduler<RenderRequest, RenderResult>;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly getSourceView: () => MarkdownView | null,
  ) {
    super(leaf);

    const timer: TimerSurface = {
      schedule: (callback, delayMs) =>
        window.setTimeout(() => {
          Promise.resolve(callback()).catch((error: unknown) => {
            new Notice(`Silmaril preview failed: ${this.errorMessage(error)}`);
          });
        }, delayMs),
      cancel: (handle) => {
        if (typeof handle !== 'number') {
          throw new TypeError('Silmaril preview received an invalid timer handle.');
        }

        window.clearTimeout(handle);
      },
    };

    this.scheduler = createRenderScheduler<RenderRequest, RenderResult>({
      timer,
      debounceMs: 250,
      getRequestId: (request) => request.requestId,
      getResultRequestId: (result) => result.requestId,
      saveBeforeRender: async (request) => request.view.save(),
      render: (request) => {
        const sourcePath = this.getSourcePath(request.view);
        const rendered = renderDeck(request.view.editor.getValue(), sourcePath);
        this.scheduler.complete({
          requestId: request.requestId,
          html: rendered.html,
        });
      },
      applyResult: (result) => {
        void this.showDeck(result.html).catch((error: unknown) => {
          new Notice(`Silmaril preview failed: ${this.errorMessage(error)}`);
        });
      },
    });
  }

  getViewType(): string {
    return SILMARIL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Silmaril preview';
  }

  getIcon(): string {
    return 'presentation';
  }

  protected async onOpen(): Promise<void> {
    this.contentEl.replaceChildren();
    this.contentEl.classList.add('silmaril-preview');
    this.hasFocusedInitialDeck = false;

    const iframe = document.createElement('iframe');
    iframe.className = 'silmaril-preview__frame';
    iframe.title = 'Silmaril presentation preview';
    // This grants scripts and same-origin access only to our trusted, self-generated deck.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    this.contentEl.append(iframe);
    this.iframe = iframe;

    this.registerEvent(
      this.app.workspace.on('editor-change', (_editor, info) => {
        if (info === this.getSourceView()) {
          this.enqueueActiveView();
        }
      }),
    );
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.enqueueActiveView()),
    );

    this.enqueueActiveView();
  }

  protected async onClose(): Promise<void> {
    this.scheduler.dispose();
    this.iframe = null;
    await this.previewTransport.dispose();
    this.contentEl.replaceChildren();
  }

  private enqueueActiveView(): void {
    const view = this.getSourceView();
    if (view === null) {
      return;
    }

    this.nextRequestId += 1;
    this.scheduler.enqueue({
      requestId: this.nextRequestId,
      view,
    });
  }

  private async showDeck(html: string): Promise<void> {
    const iframe = this.iframe;
    if (iframe === null) {
      return;
    }

    const sourceUrl = await this.previewTransport.publish(html);
    if (this.iframe !== iframe) {
      return;
    }

    if (!this.hasFocusedInitialDeck) {
      iframe.addEventListener(
        'load',
        () => {
          this.iframe?.focus();
          this.hasFocusedInitialDeck = true;
        },
        { once: true },
      );
    }
    iframe.src = sourceUrl;
  }

  private getSourcePath(view: MarkdownView): string {
    if (view.file === null) {
      throw new Error('The active Markdown editor is not backed by a vault file.');
    }
    if (!(this.app.vault.adapter instanceof FileSystemAdapter)) {
      throw new Error('Silmaril preview requires a desktop file-system vault.');
    }

    return this.app.vault.adapter.getFullPath(view.file.path);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
