import {
  FileSystemAdapter,
  ItemView,
  MarkdownView,
  Notice,
  WorkspaceLeaf,
} from 'obsidian';
import { createWikiImageResolver, renderDeck } from './renderAdapter.js';
import {
  createRenderScheduler,
  RenderScheduler,
  TimerSurface,
} from './renderScheduler.js';
import { createPreviewTransport } from './previewTransport.js';
import { slideRanges } from '../../src/pipeline/parse.js';

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

export interface PreviewSlideState {
  readonly slideId: string;
  readonly slideIndex: number;
}

interface PreviewFrameMessage extends PreviewSlideState {
  readonly type: 'silmaril-preview-ready' | 'silmaril-preview-state';
}

// Maps a source-editor cursor line to the deck slide it belongs to. Slide
// boundaries come from slideRanges so a cursor and its rendered slide always
// agree on the same id. The rendered deck prepends an overview step, so a
// content slide at parse order N is DOM step N + 1. The preview bridge matches
// on slideId first and only uses slideIndex as a fallback, which keeps both
// lookups correct.
export function slideStateForCursorLine(
  markdown: string,
  cursorLine: number,
): PreviewSlideState {
  const ranges = slideRanges(markdown);
  let matchedOrder = -1;
  for (let order = 0; order < ranges.length; order += 1) {
    if (ranges[order].headingIndex <= cursorLine) {
      matchedOrder = order;
    } else {
      break;
    }
  }
  if (matchedOrder === -1) {
    // A cursor above the first slide heading maps to the zoomed-out board.
    return { slideId: 'overview', slideIndex: 0 };
  }
  return { slideId: ranges[matchedOrder].id, slideIndex: matchedOrder + 1 };
}

export class SilmarilDeckView extends ItemView {
  private activeSlide: PreviewSlideState | null = null;
  private cursorSyncHandle: number | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private hasFocusedInitialDeck = false;
  private hasNavigatedDeck = false;
  private nextRequestId = 0;
  private lastRenderedSourceView: MarkdownView | null = null;
  private latestRenderRequest: RenderRequest | null = null;
  private pendingIframe: HTMLIFrameElement | null = null;
  private pendingPreviousIframe: HTMLIFrameElement | null = null;
  private pendingRestoreRequested = false;
  private pendingSlideTarget: PreviewSlideState | null = null;
  private resolvePendingNavigation: ((didNavigate: boolean) => void) | null =
    null;
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
      render: async (request) => {
        try {
          const file = request.view.file;
          if (file === null) {
            throw new Error('The active Markdown editor is not backed by a vault file.');
          }
          const adapter = this.getFileSystemAdapter();
          const sourcePath = adapter.getFullPath(file.path);
          const resolveWikiImage = createWikiImageResolver(this.app.metadataCache, adapter, file.path);
          const rendered = await renderDeck(request.view.editor.getValue(), sourcePath, resolveWikiImage);
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
    this.hasNavigatedDeck = false;
    this.activeSlide = null;

    const iframe = this.createIframe();
    this.contentEl.append(iframe);
    this.iframe = iframe;

    this.registerDomEvent(window, 'message', (event) => {
      this.handlePreviewMessage(event);
    });
    this.registerDomEvent(document, 'selectionchange', () => {
      this.scheduleCursorSync();
    });
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
    this.cancelCursorSync();
    this.cancelPendingNavigation();
    this.activeSlide = null;
    this.iframe = null;
    this.hasNavigatedDeck = false;
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

  private scheduleCursorSync(): void {
    this.cancelCursorSync();
    // Debounce so a drag-select or held arrow key drives a single navigation
    // after the caret settles rather than one per intermediate position.
    this.cursorSyncHandle = window.setTimeout(() => {
      this.cursorSyncHandle = null;
      this.syncCursorToPreview();
    }, 120);
  }

  private cancelCursorSync(): void {
    if (this.cursorSyncHandle !== null) {
      window.clearTimeout(this.cursorSyncHandle);
      this.cursorSyncHandle = null;
    }
  }

  private syncCursorToPreview(): void {
    const iframe = this.iframe;
    const view = this.getSourceView();
    if (iframe === null || view === null) {
      return;
    }
    // A pending refresh restores its own slide once it lands, so let it settle
    // instead of racing a navigation into an iframe about to be replaced.
    if (this.pendingIframe !== null) {
      return;
    }

    const target = slideStateForCursorLine(
      view.editor.getValue(),
      view.editor.getCursor().line,
    );
    if (this.activeSlide !== null && this.activeSlide.slideId === target.slideId) {
      return;
    }

    iframe.contentWindow?.postMessage(
      {
        type: 'silmaril-preview-restore',
        slideId: target.slideId,
        slideIndex: target.slideIndex,
      },
      '*',
    );
  }

  private async showDeck(html: string): Promise<boolean> {
    this.cancelPendingNavigation();
    const currentIframe = this.iframe;
    if (currentIframe === null) {
      return false;
    }

    const sourceUrl = await this.previewTransport.publish(html);
    if (this.iframe !== currentIframe) {
      return false;
    }
    this.cancelPendingNavigation();

    if (!this.hasNavigatedDeck) {
      if (!this.hasFocusedInitialDeck) {
        currentIframe.addEventListener(
          'load',
          () => {
            this.iframe?.focus();
            this.hasFocusedInitialDeck = true;
          },
          { once: true },
        );
      }
      currentIframe.src = sourceUrl;
      this.hasNavigatedDeck = true;
      return true;
    }

    // Keep the loaded deck visible until Obsidian finishes loading its replacement.
    const pendingIframe = this.createIframe();
    pendingIframe.className =
      'silmaril-preview__frame silmaril-preview__frame--pending';
    this.contentEl.append(pendingIframe);
    this.pendingIframe = pendingIframe;
    this.pendingPreviousIframe = currentIframe;
    this.pendingRestoreRequested = false;
    this.pendingSlideTarget = this.activeSlide;

    return new Promise<boolean>((resolve) => {
      this.resolvePendingNavigation = resolve;
      pendingIframe.src = sourceUrl;
    });
  }

  private createIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.className = 'silmaril-preview__frame';
    iframe.title = 'Silmaril presentation preview';
    // This grants scripts and same-origin access only to our trusted, self-generated deck.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    return iframe;
  }

  private handlePreviewMessage(event: MessageEvent): void {
    const message = this.readPreviewMessage(event.data);
    if (message === null) {
      return;
    }

    if (event.source === this.iframe?.contentWindow) {
      this.activeSlide = {
        slideId: message.slideId,
        slideIndex: message.slideIndex,
      };
      if (this.pendingIframe !== null) {
        this.pendingSlideTarget = this.activeSlide;
        this.pendingRestoreRequested = false;
      }
      return;
    }

    const pendingIframe = this.pendingIframe;
    if (
      pendingIframe === null ||
      event.source !== pendingIframe.contentWindow ||
      message.type !== 'silmaril-preview-ready'
    ) {
      return;
    }

    const target = this.pendingSlideTarget;
    const matchesTarget =
      target === null ||
      message.slideId === target.slideId ||
      message.slideIndex === target.slideIndex;
    if (!matchesTarget && !this.pendingRestoreRequested) {
      this.pendingRestoreRequested = true;
      pendingIframe.contentWindow?.postMessage(
        {
          type: 'silmaril-preview-restore',
          slideId: target.slideId,
          slideIndex: target.slideIndex,
        },
        '*',
      );
      return;
    }

    this.activeSlide = {
      slideId: message.slideId,
      slideIndex: message.slideIndex,
    };
    this.completePendingNavigation();
  }

  private completePendingNavigation(): void {
    const pendingIframe = this.pendingIframe;
    const previousIframe = this.pendingPreviousIframe;
    const resolve = this.resolvePendingNavigation;
    if (
      pendingIframe === null ||
      previousIframe === null ||
      resolve === null
    ) {
      return;
    }

    this.pendingIframe = null;
    this.pendingPreviousIframe = null;
    this.pendingRestoreRequested = false;
    this.pendingSlideTarget = null;
    this.resolvePendingNavigation = null;
    pendingIframe.className = 'silmaril-preview__frame';
    previousIframe.remove();
    this.iframe = pendingIframe;
    resolve(true);
  }

  private cancelPendingNavigation(): void {
    const pendingIframe = this.pendingIframe;
    const resolve = this.resolvePendingNavigation;
    this.pendingIframe = null;
    this.pendingPreviousIframe = null;
    this.pendingRestoreRequested = false;
    this.pendingSlideTarget = null;
    this.resolvePendingNavigation = null;
    pendingIframe?.remove();
    resolve?.(false);
  }

  private readPreviewMessage(data: unknown): PreviewFrameMessage | null {
    if (!this.isRecord(data)) {
      return null;
    }

    const type = data.type;
    const slideId = data.slideId;
    const slideIndex = data.slideIndex;
    if (
      (type !== 'silmaril-preview-ready' &&
        type !== 'silmaril-preview-state') ||
      typeof slideId !== 'string' ||
      typeof slideIndex !== 'number' ||
      !Number.isInteger(slideIndex) ||
      slideIndex < 0
    ) {
      return null;
    }

    return {
      type,
      slideId,
      slideIndex,
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
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
