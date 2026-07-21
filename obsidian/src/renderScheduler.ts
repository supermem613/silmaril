export interface TimerSurface {
  schedule(callback: () => void | Promise<void>, delayMs: number): unknown;
  cancel(handle: unknown): void;
}

export interface RenderSchedulerOptions<TRequest, TResult> {
  readonly timer: TimerSurface;
  readonly debounceMs: number;
  readonly getRequestId: (request: TRequest) => number;
  readonly getResultRequestId: (result: TResult) => number;
  readonly saveBeforeRender: (request: TRequest) => void | Promise<void>;
  readonly render: (request: TRequest) => void;
  readonly applyResult: (result: TResult) => void;
}

export interface RenderScheduler<TRequest, TResult> {
  enqueue(request: TRequest): void;
  complete(result: TResult): void;
  dispose(): void;
}

export function createRenderScheduler<TRequest, TResult>(
  options: RenderSchedulerOptions<TRequest, TResult>,
): RenderScheduler<TRequest, TResult> {
  let pendingHandle: unknown | null = null;
  let latestRequestId: number | null = null;
  let isDisposed = false;

  const cancelPending = () => {
    if (pendingHandle === null) {
      return;
    }

    options.timer.cancel(pendingHandle);
    pendingHandle = null;
  };

  return {
    enqueue(request) {
      if (isDisposed) {
        return;
      }

      cancelPending();
      const requestId = options.getRequestId(request);
      latestRequestId = requestId;

      pendingHandle = options.timer.schedule(async () => {
        pendingHandle = null;
        await options.saveBeforeRender(request);

        if (isDisposed || requestId !== latestRequestId) {
          return;
        }

        options.render(request);
      }, options.debounceMs);
    },
    complete(result) {
      if (isDisposed || options.getResultRequestId(result) !== latestRequestId) {
        return;
      }

      options.applyResult(result);
    },
    dispose() {
      isDisposed = true;
      cancelPending();
      latestRequestId = null;
    },
  };
}
