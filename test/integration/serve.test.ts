import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

async function withServer(run: (baseUrl: string, filePath: string) => Promise<void>): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "silmaril-serve-"));
  const filePath = join(directory, "deck.md");
  writeFileSync(filePath, deck, "utf8");
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

test("serve renders the deck with editor and live reload wired in", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /data-editor-container/i, "expected the served page to include the editor");
    assert.match(html, /data-silmaril-refresh/i, "expected the served page to include the refresh button");
    assert.match(html, /__silmaril\/livereload/i, "expected the served page to connect to live reload");
  });
});

test("serve writes edited slide bodies back to the source file and preserves frontmatter", async () => {
  await withServer(async (baseUrl, filePath) => {
    const response = await fetch(`${baseUrl}/__silmaril/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slideId: "first", markdown: "Edited first body." }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });

    const saved = readFileSync(filePath, "utf8");
    assert.ok(saved.startsWith("---\ntitle: Deck\n---\n# My Deck"), "expected frontmatter and title to survive the write-back");
    assert.match(saved, /## First\nEdited first body\./, "expected the first slide body to be rewritten in place");
    assert.match(saved, /## Second\n\nSecond body\./, "expected the second slide to be untouched");
  });
});

test("serve rejects a save for an unknown slide id", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/__silmaril/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slideId: "missing", markdown: "body" }),
    });
    assert.equal(response.status, 404);
    const payload = (await response.json()) as { ok: boolean };
    assert.equal(payload.ok, false);
  });
});
