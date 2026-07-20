import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { assemble, type Region } from "../../src/pipeline/assemble.js";
import { inlineMarkdown } from "../../src/pipeline/inline.js";
import { parseHeadingBoard } from "../../src/pipeline/parse.js";
import { renderRegion } from "../../src/pipeline/render.js";
import { getTheme } from "../../src/theme/registry.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("embeds per-slide raw Markdown source and a package-version overview signature in the engineering artifact", () => {
  const source = [
    "# Engineering Board",
    "## Application Design",
    "Use the snippet below.",
    "",
    "```ts",
    "const answer = 42;",
    "```",
    "",
    "Literal </script> marker.",
    "## Empty Slide",
  ].join("\n");

  const board = parseHeadingBoard(source);
  assert.equal(board.title, "Engineering Board");
  assert.equal(board.slides.length, 2);
  assert.equal(board.slides[0].title, "Application Design");
  assert.equal(
    board.slides[0].body,
    [
      "Use the snippet below.",
      "",
      "```ts",
      "const answer = 42;",
      "```",
      "",
      "Literal </script> marker.",
    ].join("\n"),
  );
  assert.equal(board.slides[1].title, "Empty Slide");
  assert.equal(board.slides[1].body, "");

  const packageManifest = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };
  const repositoryUrl = "https://github.com/supermem613/silmaril";
  const theme = getTheme("engineering");
  const regions: Array<Region & { markdownSource: string }> = board.slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    content: renderRegion(inlineMarkdown(slide.body, fileURLToPath(new URL("../../", import.meta.url))).markdown),
    markdownSource: slide.body,
  }));

  const assembleOptions = {
    documentTitle: board.title,
    version: packageManifest.version,
    repositoryUrl,
  };
  const html = assemble(theme, regions, assembleOptions);
  const scriptMatch = html.match(/<script type="application\/json" id="silmaril-source">([\s\S]*?)<\/script>/i);
  assert.ok(scriptMatch, "expected an embedded silmaril-source payload with per-slide raw Markdown and a bottom-right silmaril · <version> overview signature sourced from the package version");

  const payload = JSON.parse(scriptMatch[1]) as {
    title: string;
    slides: Array<{ id: string; title: string; markdown: string }>;
  };

  assert.equal(payload.title, board.title);
  assert.equal(payload.slides.length, board.slides.length);
  assert.equal(payload.slides[0].id, board.slides[0].id);
  assert.equal(payload.slides[0].title, board.slides[0].title);
  assert.equal(payload.slides[0].markdown, board.slides[0].body);
  assert.match(payload.slides[0].markdown, /```ts[\s\S]*const answer = 42;/);
  assert.match(payload.slides[0].markdown, /Literal <\/script> marker\./);
  assert.deepEqual(payload.slides[1], {
    id: board.slides[1].id,
    title: board.slides[1].title,
    markdown: board.slides[1].body,
  });

  assert.match(
    html,
    new RegExp(
      `<a[^>]+href="${escapeRegExp(repositoryUrl)}"[^>]+target="_blank"[^>]+rel="noreferrer"[^>]*>silmaril</a> · ${escapeRegExp(packageManifest.version)}`,
      "i",
    ),
    "expected the product name in the overview signature to link to the package repository without linking the version",
  );
});
