import assert from 'node:assert/strict';
import test from 'node:test';
import { createRenderScheduler, type TimerSurface } from '../src/renderScheduler.ts';

interface Request {
  readonly id: number;
  readonly content: string;
}

interface Result {
  readonly requestId: number;
  readonly content: string;
}

interface FakeHandle {
  readonly id: number;
  readonly callback: () => void | Promise<void>;
  readonly dueAt: number;
}

function createFakeTimer() {
  let now = 0;
  let nextId = 1;
  const pending = new Map<number, FakeHandle>();

  const timer: TimerSurface = {
    schedule(callback, delayMs) {
      const handle = { id: nextId++, callback, dueAt: now + delayMs };
      pending.set(handle.id, handle);
      return handle;
    },
    cancel(handle) {
      pending.delete((handle as FakeHandle).id);
    },
  };

  return {
    timer,
    pendingCount: () => pending.size,
    async advance(ms: number) {
      now += ms;
      const due = [...pending.values()]
        .filter((handle) => handle.dueAt <= now)
        .sort((left, right) => left.dueAt - right.dueAt || left.id - right.id);

      for (const handle of due) {
        pending.delete(handle.id);
        await handle.callback();
      }
    },
  };
}

test('save completes before render, bursts coalesce, stale results are suppressed, dispose cancels, and save failure rejects the scheduled cycle', async () => {
  const fakeTimer = createFakeTimer();
  const events: string[] = [];
  const rendered: Request[] = [];
  const applied: Result[] = [];

  const scheduler = createRenderScheduler<Request, Result>({
    timer: fakeTimer.timer,
    debounceMs: 25,
    getRequestId: (request) => request.id,
    getResultRequestId: (result) => result.requestId,
    saveBeforeRender: async () => {
      await Promise.resolve();
      events.push('save');
    },
    render: (request) => {
      events.push('render');
      rendered.push(request);
    },
    applyResult: (result) => {
      applied.push(result);
    },
  });

  const r1 = { id: 1, content: 'r1' };
  const r2 = { id: 2, content: 'r2' };
  const r3 = { id: 3, content: 'r3' };

  scheduler.enqueue(r1);
  scheduler.enqueue(r2);
  scheduler.enqueue(r3);

  assert.equal(fakeTimer.pendingCount(), 1);
  assert.deepEqual(events, []);

  await fakeTimer.advance(25);

  assert.deepEqual(events, ['save', 'render']);
  assert.deepEqual(rendered, [r3]);

  scheduler.complete({ requestId: 3, content: 'latest' });
  scheduler.complete({ requestId: 1, content: 'stale' });
  assert.deepEqual(applied, [{ requestId: 3, content: 'latest' }]);

  scheduler.enqueue({ id: 4, content: 'pending' });
  assert.equal(fakeTimer.pendingCount(), 1);
  scheduler.dispose();
  assert.equal(fakeTimer.pendingCount(), 0);
  await fakeTimer.advance(100);
  assert.deepEqual(rendered, [r3]);

  const failingTimer = createFakeTimer();
  const sentinel = new Error('save failed');
  let failedRenderCount = 0;
  const failingScheduler = createRenderScheduler<Request, Result>({
    timer: failingTimer.timer,
    debounceMs: 25,
    getRequestId: (request) => request.id,
    getResultRequestId: (result) => result.requestId,
    saveBeforeRender: async () => {
      throw sentinel;
    },
    render: () => {
      failedRenderCount += 1;
    },
    applyResult: () => undefined,
  });

  failingScheduler.enqueue({ id: 5, content: 'fails' });
  await assert.rejects(failingTimer.advance(25), (error) => error === sentinel);
  assert.equal(failedRenderCount, 0);
});
