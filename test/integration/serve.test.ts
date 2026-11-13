import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createServeServer } from "../../src/commands/serve.js";

const deck = [
  "---",
  "title: Deck",
  "---",
  "# My Deck",
  "",
  "## First",
  "",
  "First body.",
  "",
  "## Second",
  "",
  "Second body.",
  "",
].join("\n");

async function withServer(
  run: (baseUrl: string, filePath: string) => Promise<void>,
  source = deck,
): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "silmaril-serve-"));
  const filePath = join(directory, "deck.md");
  writeFileSync(filePath, source, "utf8");
  const { server, close } = createServeServer(filePath, { watchInterval: 50 });
  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${port}`, filePath);
  } finally {
    await close();
    rmSync(directory, { recursive: true, force: true });
  }
}

test("serve renders the deck with the live-reload client wired in", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /My Deck/, "expected the served page to render the deck");
    assert.match(html, /__silmaril\/livereload/i, "expected the served page to connect to live reload");
    assert.doesNotMatch(html, /data-editor/i, "expected the served page to omit the in-browser editor");
    assert.doesNotMatch(html, /data-silmaril-refresh/i, "expected the served page to omit a refresh button");
  });
});

test("serve renders a scrolling document for a document directive", async () => {
  const document = [
    "# Architecture review",
    "",
    ":::silmaril document",
    ":::",
    "",
    "## Context",
    "",
    "Natural-height body.",
  ].join("\n");

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<body class="engineering-document">/);
    assert.match(html, /data-silmaril-document/);
    assert.doesNotMatch(html, /<div id="impress"/);
  }, document);
});

test("serve exposes a live-reload event stream", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/__silmaril/livereload`, {
      headers: { Accept: "text/event-stream" },
    });
    try {
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
    } finally {
      await response.body?.cancel();
    }
  });
});

test("serve returns 404 for unknown routes", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/does-not-exist`);
    assert.equal(response.status, 404);
    await response.text();
  });
});
