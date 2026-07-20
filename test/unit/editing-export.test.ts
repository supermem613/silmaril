import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { inlineMarkdown } from "../../src/pipeline/inline.js";
import { parseBoard } from "../../src/pipeline/parse.js";
import { renderMarkdown } from "../../src/pipeline/render.js";
import { buildPresentation, type PresentationSlide } from "../../src/presentation/index.js";

test("exports the edited deck as Markdown from the source model via File System Access with download fallback", async () => {
  const source = [
    "# Markdown Export",
    "## Intro",
    "Edited body for the first slide.",
    "## Details",
    "",
    "Second body.",
    "## Empty",
  ].join("\n");

  const board = parseBoard(source);
  const slides: PresentationSlide[] = board.slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    content: renderMarkdown(inlineMarkdown(slide.body, fileURLToPath(new URL("../../", import.meta.url))).markdown),
    markdownSource: slide.body,
  }));

  const html = buildPresentation(slides, { documentTitle: board.title, version: "test" });
  const sourcePayloadMatch = html.match(/<script type="application\/json" id="silmaril-source">([\s\S]*?)<\/script>/i);
  assert.ok(sourcePayloadMatch, "expected the engineering artifact to include the silmaril-source payload for export runtime state");
  const payload = JSON.parse(sourcePayloadMatch[1]) as { title: string; slides: Array<{ id: string; title: string; markdown: string }> };

  assert.equal(payload.slides.length, 3, "expected all ordered slides in the silmaril-source payload");
  assert.equal(payload.slides[0].title, "Intro", "expected the first slide title to be preserved in order");
  assert.equal(payload.slides[1].title, "Details", "expected the second slide title to be preserved in order");
  assert.equal(payload.slides[2].title, "Empty", "expected the third slide title to be preserved in order");
  assert.equal(payload.slides[0].markdown, "Edited body for the first slide.", "expected the edited slide markdown to be preserved in the source payload");
  assert.equal(payload.slides[1].markdown, "\nSecond body.", "expected a source body separator newline to be preserved exactly");
  assert.equal(payload.slides[2].markdown, "", "expected the empty markdown body case to be preserved in the source payload");

  assert.match(html, /<button[^>]+data-export-markdown[^>]*>[\s\S]*?Export Markdown/i, "expected an Export Markdown control in the engineering artifact");
  const exportScriptMatch = html.match(/<script[^>]+data-silmaril-export[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(exportScriptMatch, "expected a dedicated embedded Markdown export runtime using showSaveFilePicker with an anchor and Blob fallback");
  const exportScript = exportScriptMatch[1];

  assert.match(exportScript, /window\.silmarilSourceModel/i, "expected serialization to read edited slide objects from window.silmarilSourceModel");
  assert.match(exportScript, /JSON\.parse|sourcePayload|payload\.title|documentTitle/i, "expected serialization to obtain the document title from parsed silmaril-source JSON");
  assert.match(exportScript, /#\s*['"]?\s*\+\s*(?:title|documentTitle|payload\.title|sourcePayload\.title)/i, "expected serialization to construct a level-one heading from the document title");
  assert.match(exportScript, /##\s*['"]?\s*\+\s*(?:slide\.title|title)/i, "expected serialization to construct level-two headings from each slide title in order");
  assert.match(exportScript, /slide\.markdown|markdown\s*\+|markdown\s*\)|markdown\s*;/i, "expected serialization to append each current slide markdown body after the slide heading");
  assert.match(exportScript, /\\n\\n|\\n\s*\\n/i, "expected serialization to join the document sections with blank lines");
  assert.match(exportScript, /showSaveFilePicker/i, "expected the native save path to use window.showSaveFilePicker");
  assert.match(exportScript, /createWritable\s*\(/i, "expected the native save path to create a writable for the exported file");
  assert.match(exportScript, /write\s*\(/i, "expected the native save path to write the serialized Markdown");
  assert.match(exportScript, /close\s*\(/i, "expected the native save path to close the writable");
  assert.match(exportScript, /text\/markdown|\.md/i, "expected the native save path to use a Markdown file type or .md extension");
  assert.match(exportScript, /new Blob/i, "expected the download fallback to construct a Blob from the serialized Markdown");
  assert.match(exportScript, /text\/markdown/i, "expected the download fallback to use the text/markdown MIME type");
  assert.match(exportScript, /URL\.createObjectURL/i, "expected the download fallback to create an object URL");
  assert.match(exportScript, /\.download\s*=|download\s*=|\.download/i, "expected the download fallback to assign an anchor download name ending in .md");
  assert.match(exportScript, /click\s*\(/i, "expected the download fallback to trigger the anchor click");
  assert.match(exportScript, /URL\.revokeObjectURL/i, "expected the download fallback to revoke the object URL");

  const editedSlides = [
    { ...payload.slides[0], markdown: "Edited inside Silmaril." },
    ...payload.slides.slice(1),
  ];
  const expectedMarkdown = "# Markdown Export\n\n## Intro\n\nEdited inside Silmaril.\n\n## Details\n\nSecond body.\n\n## Empty\n";
  const sourceScript = { textContent: JSON.stringify(payload) };
  const body = { appendChild() {} };

  let nativeClickHandler: (() => Promise<void>) | undefined;
  let nativeWritten = "";
  let nativeClosed = false;
  const nativeButton = {
    addEventListener(_type: string, handler: () => Promise<void>) {
      nativeClickHandler = handler;
    },
  };
  const nativeActions = {
    firstChild: {},
    insertBefore(button: unknown) {
      assert.equal(button, nativeButton, "expected the export button to join the shared editor actions");
    },
  };
  const nativeDocument = {
    readyState: "complete",
    body,
    querySelector(selector: string) {
      if (selector === "[data-editor-actions]") {
        return nativeActions;
      }
      if (selector === "[data-export-markdown]") {
        return nativeButton;
      }
      return null;
    },
    getElementById() {
      return sourceScript;
    },
  };
  const nativeWindow = {
    silmarilSourceModel: editedSlides,
    async showSaveFilePicker() {
      return {
        async createWritable() {
          return {
            async write(markdown: string) {
              nativeWritten = markdown;
            },
            async close() {
              nativeClosed = true;
            },
          };
        },
      };
    },
  };

  runInNewContext(exportScript, { document: nativeDocument, window: nativeWindow, Blob, URL });
  assert.ok(nativeClickHandler, "expected the export control to register its native save handler");
  await nativeClickHandler();
  assert.equal(nativeWritten, expectedMarkdown, "expected native save to receive the exact edited whole-deck Markdown");
  assert.equal(nativeClosed, true, "expected native save to close the writable");

  let fallbackClickHandler: (() => Promise<void>) | undefined;
  let fallbackBlob: { parts: readonly unknown[]; options: { type: string } } | undefined;
  let fallbackClicked = false;
  let fallbackRemoved = false;
  let revokedUrl = "";
  const fallbackAnchor = {
    href: "",
    download: "",
    style: { display: "" },
    click() {
      fallbackClicked = true;
    },
    remove() {
      fallbackRemoved = true;
    },
  };
  class BlobMock {
    constructor(parts: readonly unknown[], options: { type: string }) {
      fallbackBlob = { parts, options };
    }
  }
  const fallbackButton = {
    addEventListener(_type: string, handler: () => Promise<void>) {
      fallbackClickHandler = handler;
    },
  };
  const fallbackActions = {
    firstChild: {},
    insertBefore(button: unknown) {
      assert.equal(button, fallbackButton, "expected the fallback export button to join the shared editor actions");
    },
  };
  const fallbackDocument = {
    readyState: "complete",
    body,
    querySelector(selector: string) {
      if (selector === "[data-editor-actions]") {
        return fallbackActions;
      }
      if (selector === "[data-export-markdown]") {
        return fallbackButton;
      }
      return null;
    },
    getElementById() {
      return sourceScript;
    },
    createElement() {
      return fallbackAnchor;
    },
  };
  const fallbackUrl = {
    createObjectURL() {
      return "blob:silmaril-export";
    },
    revokeObjectURL(url: string) {
      revokedUrl = url;
    },
  };

  runInNewContext(exportScript, {
    document: fallbackDocument,
    window: { silmarilSourceModel: editedSlides },
    Blob: BlobMock,
    URL: fallbackUrl,
  });
  assert.ok(fallbackClickHandler, "expected the export control to register its download fallback handler");
  await fallbackClickHandler();
  assert.equal(fallbackBlob?.parts.length, 1, "expected the fallback Blob to contain one Markdown payload");
  assert.equal(String(fallbackBlob?.parts[0]), expectedMarkdown, "expected the fallback Blob to contain the exact edited whole-deck Markdown");
  assert.equal(fallbackBlob?.options.type, "text/markdown;charset=utf-8", "expected the fallback Blob to use the Markdown MIME type");
  assert.equal(fallbackAnchor.download, "Markdown-Export.md", "expected the fallback filename to derive from the document title");
  assert.equal(fallbackClicked, true, "expected the fallback anchor to be clicked");
  assert.equal(fallbackRemoved, true, "expected the fallback anchor to be removed after the click");
  assert.equal(revokedUrl, "blob:silmaril-export", "expected the fallback object URL to be revoked");
});
