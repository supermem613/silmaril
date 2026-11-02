import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import '../src/renderWorker.js';

interface WorkerResponse {
  requestId: number;
  ok: boolean;
  html?: string;
  error?: string;
}

const worker = globalThis as unknown as {
  onmessage(event: { data: { requestId: number; markdown: string; sourcePath: string } }): Promise<void>;
  postMessage(message: WorkerResponse): void;
};

test('the render worker waits for images and returns download failures with their request ID', async (t) => {
  const image = '<svg xmlns="http://www.w3.org/2000/svg"/>';
  const server = createServer((request, response) => {
    if (request.url === '/image') {
      response.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      response.end(image);
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  const messages: WorkerResponse[] = [];
  const originalPostMessage = worker.postMessage;
  t.after(() => { worker.postMessage = originalPostMessage; });
  worker.postMessage = (message) => messages.push(message);

  await worker.onmessage({ data: { requestId: 1, markdown: `## Image\n\n![Worker](${url}/image)`, sourcePath: 'deck.md' } });
  await worker.onmessage({ data: { requestId: 2, markdown: `## Image\n\n![Missing](${url}/missing)`, sourcePath: 'deck.md' } });

  assert.deepEqual(messages.map((message) => ({
    requestId: message.requestId,
    ok: message.ok,
    image: message.html?.match(/<img src="([^"]+)" alt="Worker">/)?.[1],
    error: message.error,
  })), [
    { requestId: 1, ok: true, image: `data:image/svg+xml;base64,${Buffer.from(image).toString('base64')}`, error: undefined },
    { requestId: 2, ok: false, image: undefined, error: `Unable to load image ${url}/missing: HTTP 404` },
  ]);
});
