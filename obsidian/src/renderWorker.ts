import { renderDeck } from './renderAdapter.js';

interface RenderWorkerRequest {
  readonly requestId: number;
  readonly markdown: string;
  readonly sourcePath: string;
}

type RenderWorkerResponse =
  | {
      readonly requestId: number;
      readonly ok: true;
      readonly html: string;
      readonly slideCount: number;
    }
  | {
      readonly requestId: number;
      readonly ok: false;
      readonly error: string;
    };

interface WorkerSurface {
  onmessage: ((event: { readonly data: RenderWorkerRequest }) => void) | null;
  postMessage(message: RenderWorkerResponse): void;
}

const worker = globalThis as unknown as WorkerSurface;

worker.onmessage = async ({ data }) => {
  try {
    const rendered = await renderDeck(data.markdown, data.sourcePath);
    worker.postMessage({
      requestId: data.requestId,
      ok: true,
      ...rendered,
    });
  } catch (error) {
    worker.postMessage({
      requestId: data.requestId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
