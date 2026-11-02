import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test, { type TestContext } from "node:test";
import * as silmaril from "../../src/index.js";
import { createServeServer } from "../../src/commands/serve.js";

const imageBytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>');
const embeddedImage = `data:image/svg+xml;base64,${imageBytes.toString("base64")}`;

async function imageServer(t: TestContext) {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url ?? "");
    if (request.url === "/redirect") {
      response.writeHead(302, { Location: "/image?token=sample&size=full" });
      response.end();
    } else if (request.url === "/image?token=sample&size=full") {
      response.writeHead(200, { "Content-Type": "image/svg+xml; charset=utf-8" });
      response.end(imageBytes);
    } else if (request.url === "/page") {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end("<html>Not an image</html>");
    } else if (request.url === "/empty") {
      response.writeHead(200, { "Content-Type": "image/png" });
      response.end();
    } else {
      response.writeHead(404);
      response.end("Missing image");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const close = () => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  t.after(() => server.listening ? close() : undefined);
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, requests, close };
}

function deckFiles(t: TestContext, markdown: string) {
  const directory = mkdtempSync(join(tmpdir(), "silmaril-images-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const inputPath = join(directory, "deck.md");
  const outputPath = join(directory, "deck.html");
  writeFileSync(inputPath, markdown, "utf8");
  return { inputPath, outputPath };
}

function publish(inputPath: string, outputPath: string): Promise<{ code: number | null; stdout: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", resolve("src/cli.ts"), "publish", inputPath, "--out", outputPath]);
    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString(); 
    });
    child.stderr.resume();
    child.on("error", reject);
    child.on("close", (code) => resolveResult({ code, stdout }));
  });
}

test("renderAsync embeds remote images once per build, including references and columns", async (t) => {
  const fixture = await imageServer(t);
  const source = `${fixture.url}/image?token=sample&size=full`;
  const markdown = `# Images\n\n## First\n\n![First](${source})\n\n## Columns\n\n:::columns\n![Second][image]\n\n[image]: ${source}\n\n---\n![Third](${source})\n:::`;
  const { html } = await silmaril.renderAsync(markdown);
  await fixture.close();

  assert.deepEqual({
    images: [...html.matchAll(/<img src="([^"]+)" alt="([^"]*)">/g)].map((match) => [match[1], match[2]]),
    requests: fixture.requests,
  }, {
    images: [[embeddedImage, "First"], [embeddedImage, "Second"], [embeddedImage, "Third"]],
    requests: ["/image?token=sample&size=full"],
  });
});

test("renderAsync follows image redirects and preserves code examples", async (t) => {
  const fixture = await imageServer(t);
  const example = `![Example](${fixture.url}/code-only)`;
  const { html } = await silmaril.renderAsync(`## Image\n\n![Redirect](${fixture.url}/redirect)\n\n\`${example}\`\n\n\`\`\`\n${example}\n\`\`\``);

  assert.deepEqual({
    image: html.match(/<img src="([^"]+)" alt="Redirect">/)?.[1],
    inlineCode: html.includes(`<code>${example}</code>`),
    fencedCode: html.includes(`<pre><code>${example}\n</code></pre>`),
    requests: fixture.requests,
  }, {
    image: embeddedImage,
    inlineCode: true,
    fencedCode: true,
    requests: ["/redirect", "/image?token=sample&size=full"],
  });
});

test("renderAsync reports an unsuccessful image response", async (t) => {
  const fixture = await imageServer(t);
  await assert.rejects(
    () => silmaril.renderAsync(`## Image\n\n![Missing](${fixture.url}/missing)`),
    /Unable to load image .*\/missing: HTTP 404/,
  );
});

test("renderAsync reports unsupported image media instead of silently dropping it", async (t) => {
  const fixture = await imageServer(t);
  await assert.rejects(
    () => silmaril.renderAsync(`## Image\n\n![Page](${fixture.url}/page)`),
    /Unable to load image .*\/page: unsupported image media type text\/html/,
  );
});

test("renderAsync reports empty images", async (t) => {
  const fixture = await imageServer(t);
  await assert.rejects(
    () => silmaril.renderAsync(`## Image\n\n![Empty](${fixture.url}/empty)`),
    /Unable to load image .*\/empty: empty image response/,
  );
});

test("publish embeds remote image bytes in the standalone file", async (t) => {
  const fixture = await imageServer(t);
  const files = deckFiles(t, `## Image\n\n![Published](${fixture.url}/image?token=sample&size=full)`);
  const result = await publish(files.inputPath, files.outputPath);
  const html = result.code === 0 ? readFileSync(files.outputPath, "utf8") : "";

  assert.deepEqual({
    code: result.code,
    image: html.match(/<img src="([^"]+)" alt="Published">/)?.[1],
  }, { code: 0, image: embeddedImage }, result.stdout);
});

for (const [route, reason] of [["missing", "HTTP 404"], ["page", "unsupported image media type text/html"], ["empty", "empty image response"]]) {
  test(`publish preserves existing output when an image fails: ${route}`, async (t) => {
    const fixture = await imageServer(t);
    const files = deckFiles(t, `## Image\n\n![Failed](${fixture.url}/${route})`);
    const previousOutput = "<!doctype html><html><body>Previous deck</body></html>";
    writeFileSync(files.outputPath, previousOutput, "utf8");
    const result = await publish(files.inputPath, files.outputPath);
    const envelope = JSON.parse(result.stdout) as { error?: string; hint?: string };

    assert.deepEqual({
      code: result.code,
      error: envelope.error,
      hint: envelope.hint,
      output: readFileSync(files.outputPath, "utf8"),
    }, {
      code: 1,
      error: "publish-failed",
      hint: `Unable to load image ${fixture.url}/${route}: ${reason}`,
      output: previousOutput,
    });
  });
}

test("serve embeds remote images", async (t) => {
  const fixture = await imageServer(t);
  const files = deckFiles(t, `## Image\n\n![Served](${fixture.url}/image?token=sample&size=full)`);
  const handle = createServeServer(files.inputPath);
  t.after(() => handle.close());
  await new Promise<void>((resolveListen) => handle.server.listen(0, "127.0.0.1", resolveListen));
  const { port } = handle.server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${port}/`);
  const html = await response.text();

  assert.deepEqual({
    status: response.status,
    image: html.match(/<img src="([^"]+)" alt="Served">/)?.[1],
  }, { status: 200, image: embeddedImage });
});

test("serve reports image download failures as HTTP errors", async (t) => {
  const fixture = await imageServer(t);
  const files = deckFiles(t, `## Image\n\n![Missing](${fixture.url}/missing)`);
  const handle = createServeServer(files.inputPath);
  t.after(() => handle.close());
  await new Promise<void>((resolveListen) => handle.server.listen(0, "127.0.0.1", resolveListen));
  const { port } = handle.server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${port}/`);

  assert.deepEqual({
    status: response.status,
    body: await response.text(),
  }, {
    status: 500,
    body: `Unable to load image ${fixture.url}/missing: HTTP 404`,
  });
});
