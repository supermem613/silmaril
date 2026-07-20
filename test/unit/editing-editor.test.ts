import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { assemble, type Region } from "../../src/pipeline/assemble.js";
import { inlineMarkdown } from "../../src/pipeline/inline.js";
import { parseHeadingBoard } from "../../src/pipeline/parse.js";
import { renderRegion } from "../../src/pipeline/render.js";
import { engineeringTokensCss } from "../../src/theme/engineering/tokens.css.js";
import { getTheme } from "../../src/theme/registry.js";

function parseHexColor(value: string): [number, number, number] {
  const normalized = value.trim().replace(/^#/, "").toLowerCase();
  assert.match(normalized, /^[0-9a-f]{6}$/i, `expected a 6-digit hex color but received ${value}`);
  const hex = normalized;
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHexColor(hex);
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractCssRule(css: string, selector: string): string | null {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "i"));
  return match?.[1] ?? null;
}

test("embeds a slide-local Markdown editor with Markdown-based live preview, runtime persistence, and an accessible amber --strong emphasis color shared by the rendered slide and the live preview", () => {
  const source = [
    "# Engineering Board",
    "## Inline Editing",
    "Use **strong** emphasis and the slide-local editor.",
  ].join("\n");

  const board = parseHeadingBoard(source);
  const theme = getTheme("engineering");
  const regions: Array<Region & { markdownSource: string }> = board.slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    content: renderRegion(inlineMarkdown(slide.body, fileURLToPath(new URL("../../", import.meta.url))).markdown),
    markdownSource: slide.body,
  }));

  const html = assemble(theme, regions, { documentTitle: board.title, version: "test" });
  const markdownItBundle = readFileSync(new URL("../../node_modules/markdown-it/dist/markdown-it.min.js", import.meta.url), "utf8");
  const sourcePayloadMatch = html.match(/<script type="application\/json" id="silmaril-source">([\s\S]*?)<\/script>/i);
  assert.ok(sourcePayloadMatch, "expected the engineering artifact to include the silmaril-source payload for the slide-local editor runtime");
  const payload = JSON.parse(sourcePayloadMatch[1]) as { title: string; slides: Array<{ id: string; title: string; markdown: string }> };
  assert.ok(payload.slides.length > 0, "expected the silmaril-source payload to carry slide markdown for the editor runtime");

  assert.match(html, /<div[^>]+data-editor-container/i, "expected an embedded editor container for the slide-local Markdown editor");
  assert.match(html, /<textarea[^>]+data-editor-input/i, "expected a textarea input for the focused slide's Markdown");
  assert.match(html, /<div[^>]+data-editor-preview/i, "expected a live preview container for the slide-local Markdown editor");
  assert.ok(html.includes(markdownItBundle), "expected the complete local markdown-it browser bundle to be embedded in the single-file artifact");

  const inlineScripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]).join("\n");
  assert.match(inlineScripts, /JSON\.parse/i, "expected the editor runtime to parse the silmaril-source JSON payload into runtime state");
  assert.match(inlineScripts, /sourceModel|new Map|Map\(/i, "expected the editor runtime to build an in-memory source model or equivalent Map/object keyed by slide id");
  assert.match(inlineScripts, /slide\.id|payload\.slides|slides\[|sourcePayload/i, "expected the editor runtime to use the silmaril-source slide payload when associating markdown with each slide id");
  assert.match(inlineScripts, /dataset\.slideId\s*=\s*[^;]*\.id/i, "expected the editor runtime to associate the textarea with the focused slide id");
  assert.match(inlineScripts, /\.markdown\s*=\s*(?:textarea\.value|event\.target\.value|markdown)/i, "expected the textarea input path to assign its value to the matching source-model slide markdown");
  assert.match(inlineScripts, /markdown-it|marked|remark|showdown/i, "expected the live preview path to use a bundled local Markdown renderer");
  assert.match(inlineScripts, /(?:render|renderInline)\(\s*(?:textarea\.value|event\.target\.value|markdown)/i, "expected the editor runtime to pass textarea Markdown to the preview renderer");
  assert.match(inlineScripts, /document\.body\.appendChild\([^)]*editor[^)]*\)/i, "expected the editor shell to be moved outside the transformed Impress canvas");

  const editorShellRule = extractCssRule(engineeringTokensCss, ".engineering-editor-shell");
  const overviewEditorRule = extractCssRule(engineeringTokensCss, "body:has(.step.active[data-id=\"overview\"]) .engineering-editor-shell");
  assert.ok(editorShellRule, "expected an engineering editor shell CSS rule");
  assert.match(editorShellRule ?? "", /position:\s*fixed/i, "expected the editor shell to be fixed to the viewport outside Impress transforms");
  assert.ok(overviewEditorRule, "expected an overview-specific rule that hides the editor shell on the whole board");
  assert.match(overviewEditorRule ?? "", /opacity:\s*0/i, "expected the editor shell to be visually hidden on the whole board");
  assert.match(overviewEditorRule ?? "", /pointer-events:\s*none/i, "expected the editor shell to be non-interactive on the whole board");

  const engineeringCardStrongRule = extractCssRule(engineeringTokensCss, ".engineering-card strong");
  const editorPreviewStrongRule = extractCssRule(engineeringTokensCss, ".editor-preview strong") ?? extractCssRule(engineeringTokensCss, "[data-editor-preview] strong");
  assert.ok(engineeringCardStrongRule, "expected a .engineering-card strong CSS rule for the rendered slide strong emphasis styling");
  assert.ok(editorPreviewStrongRule, "expected an editor preview strong selector rule such as .editor-preview strong or [data-editor-preview] strong");
  assert.match(engineeringCardStrongRule ?? "", /color:\s*var\(--strong\)/i, "expected .engineering-card strong to use color var(--strong)");
  assert.match(editorPreviewStrongRule ?? "", /color:\s*var\(--strong\)/i, "expected the editor preview strong selector to use color var(--strong)");

  assert.match(engineeringTokensCss, /:root\s*\{[\s\S]*?--strong:\s*var\(--dark-strong\)/i, "expected the root dark defaults to bind --strong to --dark-strong");
  assert.match(engineeringTokensCss, /html\[data-theme="light"\][\s\S]*?--strong:\s*var\(--light-strong\)/i, "expected the light document theme block to bind --strong to --light-strong");
  assert.match(engineeringTokensCss, /\.engineering-card\[data-theme="light"\][\s\S]*?--strong:\s*var\(--light-strong\)/i, "expected .engineering-card[data-theme=light] to bind --strong to --light-strong");
  assert.match(engineeringTokensCss, /\.engineering-card\[data-theme="dark"\][\s\S]*?--strong:\s*var\(--dark-strong\)/i, "expected .engineering-card[data-theme=dark] to bind --strong to --dark-strong");

  const darkStrong = engineeringTokensCss.match(/--dark-strong:\s*(#[0-9a-f]{6})/i)?.[1];
  const lightStrong = engineeringTokensCss.match(/--light-strong:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(darkStrong, "expected amber --dark-strong and --light-strong tokens for the shared strong emphasis color");
  assert.ok(lightStrong, "expected amber --dark-strong and --light-strong tokens for the shared strong emphasis color");

  const darkSurface = "#14191D";
  const lightSurface = "#FFFFFF";
  assert.ok(contrastRatio(darkStrong, darkSurface) >= 4.5, `expected --dark-strong ${darkStrong} to meet WCAG AA contrast against ${darkSurface}`);
  assert.ok(contrastRatio(lightStrong, lightSurface) >= 4.5, `expected --light-strong ${lightStrong} to meet WCAG AA contrast against ${lightSurface}`);
});

test("resolves the Markdown renderer from a hoisted dependency in a packed install layout", async () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "silmaril-packed-editor-"));
  const installedRoot = join(fixtureRoot, "node_modules", "silmaril");
  const editorPath = join(installedRoot, "dist", "theme", "engineering", "editor.ts");
  const hoistedMarkdownItPath = join(fixtureRoot, "node_modules", "markdown-it");

  try {
    mkdirSync(dirname(editorPath), { recursive: true });
    writeFileSync(join(installedRoot, "package.json"), JSON.stringify({ type: "module" }));
    writeFileSync(editorPath, readFileSync(new URL("../../src/theme/engineering/editor.ts", import.meta.url), "utf8"));
    cpSync(new URL("../../node_modules/markdown-it", import.meta.url), hoistedMarkdownItPath, { recursive: true });

    const installedEditor = await import(pathToFileURL(editorPath).href);
    const markdownItBundle = readFileSync(join(hoistedMarkdownItPath, "dist", "markdown-it.min.js"), "utf8");
    assert.ok(installedEditor.engineeringEditorScript.includes(markdownItBundle), "expected the packed editor to embed the hoisted markdown-it browser bundle");
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
