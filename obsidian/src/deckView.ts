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
  readonly view: MarkdownView;
}

export class SilmarilDeckView extends ItemView {
  private iframe: HTMLIFrameElement | null = null;
  private hasFocusedInitialDeck = false;
  private nextRequestId = 0;
  private lastRenderedSourceView: MarkdownView | null = null;
  private latestRenderRequest: RenderRequest | null = null;
  private readonly previewTransport: ReturnType<typeof createPreviewTransport>;
  private readonly scheduler: RenderScheduler<RenderRequest, RenderResult>;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly getSourceView: () => MarkdownView | null,
  ) {
    super(leaf);

    const adapter = this.getFileSystemAdapter();
    this.previewTransport = createPreviewTransport({
      directory: `${this.app.vault.configDir}/plugins/silmaril-obsidian`,
      fileSystem: {
        mkdir: async (directory) => {
          if (!(await adapter.exists(directory))) {
            await adapter.mkdir(directory);
          }
        },
        rm: async (filePath) => {
          if (await adapter.exists(filePath)) {
            await adapter.remove(filePath);
          }
        },
        writeFile: async (filePath, content) => {
          await adapter.write(filePath, content);
        },
      },
      joinPath: (directory, fileName) => `${directory}/${fileName}`,
      toResourceUrl: (filePath) => adapter.getResourcePath(filePath),
    });

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
      saveBeforeRender: async (request) => {
        try {
          await request.view.save();
        } catch (error: unknown) {
          this.invalidateFailedRequest(request);
          throw error;
        }
      },
      render: (request) => {
        try {
          const sourcePath = this.getSourcePath(request.view);
          const rendered = renderDeck(request.view.editor.getValue(), sourcePath);
          this.scheduler.complete({
            requestId: request.requestId,
            html: rendered.html,
            view: request.view,
          });
        } catch (error: unknown) {
          this.invalidateFailedRequest(request);
          throw error;
        }
      },
      applyResult: (result) => {
        void this.showDeck(result.html)
          .then((didNavigate) => {
            if (!didNavigate) {
              this.invalidateFailedRequest(result);
              return;
            }
            if (this.latestRenderRequest?.requestId !== result.requestId) {
              return;
            }
            this.lastRenderedSourceView = result.view;
            this.latestRenderRequest = null;
          })
          .catch((error: unknown) => {
            this.invalidateFailedRequest(result);
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
          this.enqueueActiveView(true);
        }
      }),
    );
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.enqueueActiveView()),
    );

    this.enqueueActiveView(true);
  }

  protected async onClose(): Promise<void> {
    this.scheduler.dispose();
    this.iframe = null;
    await this.previewTransport.dispose();
    this.contentEl.replaceChildren();
  }

  private enqueueActiveView(force = false): void {
    const view = this.getSourceView();
    if (view === null) {
      return;
    }

    if (!force && view === this.lastRenderedSourceView) {
      return;
    }

    const request = {
      requestId: this.nextRequestId + 1,
      view,
    };
    this.nextRequestId = request.requestId;
    this.latestRenderRequest = request;
    this.scheduler.enqueue(request);
  }

  private async showDeck(html: string): Promise<boolean> {
    const iframe = this.iframe;
    if (iframe === null) {
      return false;
    }

    const sourceUrl = await this.previewTransport.publish(html);
    if (this.iframe !== iframe) {
      return false;
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
    return true;
  }

  private invalidateFailedRequest(request: RenderRequest): void {
    if (this.latestRenderRequest?.requestId !== request.requestId) {
      return;
    }

    this.latestRenderRequest = null;
    if (this.lastRenderedSourceView === request.view) {
      this.lastRenderedSourceView = null;
    }
  }

  private getSourcePath(view: MarkdownView): string {
    if (view.file === null) {
      throw new Error('The active Markdown editor is not backed by a vault file.');
    }

    return this.getFileSystemAdapter().getFullPath(view.file.path);
  }

  private getFileSystemAdapter(): FileSystemAdapter {
    if (!(this.app.vault.adapter instanceof FileSystemAdapter)) {
      throw new Error('Silmaril preview requires a desktop file-system vault.');
    }

    return this.app.vault.adapter;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
