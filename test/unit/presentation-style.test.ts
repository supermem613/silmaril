import assert from "node:assert/strict";
import test from "node:test";
import { buildPresentation, type PresentationSlide } from "../../src/presentation/index.js";
import { engineeringNavigationScript, engineeringProgressMarkup } from "../../src/presentation/toggle.js";
import { engineeringTokensCss } from "../../src/presentation/tokens.css.js";

function parseHexColor(value: string): [number, number, number] {
  const normalized = value.trim().replace(/^#/, "").toLowerCase();
  assert.match(normalized, /^[0-9a-f]{6}$/i, `expected a 6-digit hex color but received ${value}`);
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
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
  return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
}

function extractCssRule(css: string, selector: string): string | null {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "i"));
  return match?.[1] ?? null;
}

test("styles the engineering board with amber strong emphasis at accessible contrast", () => {
  assert.match(engineeringTokensCss, /--dark-bg:\s*#000000/i, "expected the dark canvas token to use true black");
  assert.match(
    engineeringTokensCss,
    /html,\s*body\.engineering-theme\s*\{[\s\S]*?background:\s*var\(--dark-bg\)/i,
    "expected the general dark board area to use the dark canvas token",
  );

  const engineeringCardStrongRule = extractCssRule(engineeringTokensCss, ".engineering-card strong");
  assert.ok(engineeringCardStrongRule, "expected a .engineering-card strong CSS rule");
  assert.match(engineeringCardStrongRule ?? "", /color:\s*var\(--strong\)/i, "expected strong emphasis to use var(--strong)");

  const darkCardRule = extractCssRule(engineeringTokensCss, ".engineering-card[data-theme=\"dark\"]");
  assert.ok(darkCardRule, "expected a dark engineering card surface rule");
  assert.match(darkCardRule ?? "", /background:\s*#000000/i, "expected dark overview cards to use true black");

  const engineeringCardRule = extractCssRule(engineeringTokensCss, ".engineering-card");
  assert.ok(engineeringCardRule, "expected the shared engineering card rule");
  assert.match(engineeringCardRule ?? "", /border:\s*1px solid var\(--border\)/i, "expected overview cards to retain their boundary");
  assert.match(engineeringCardRule ?? "", /box-shadow:\s*0 18px 40px var\(--shadow\)/i, "expected overview cards to retain their depth");

  const focusedDarkCardRule = extractCssRule(
    engineeringTokensCss,
    "body:not(:has(.step.active[data-id=\"overview\"])) .step.active .engineering-card[data-theme=\"dark\"]",
  );
  assert.ok(focusedDarkCardRule, "expected a focused dark-slide surface rule");
  assert.match(focusedDarkCardRule ?? "", /background:\s*#000(?:000)?/i, "expected the focused dark slide to use true black");
  assert.match(focusedDarkCardRule ?? "", /border-color:\s*transparent/i, "expected the focused dark slide border to disappear");
  assert.match(focusedDarkCardRule ?? "", /box-shadow:\s*none/i, "expected the focused dark slide shadow to disappear");

  assert.match(engineeringTokensCss, /:root\s*\{[\s\S]*?--strong:\s*var\(--dark-strong\)/i, "expected the root dark defaults to bind --strong to --dark-strong");
  assert.match(engineeringTokensCss, /html\[data-theme="light"\][\s\S]*?--strong:\s*var\(--light-strong\)/i, "expected the light document theme block to bind --strong to --light-strong");

  const darkStrong = engineeringTokensCss.match(/--dark-strong:\s*(#[0-9a-f]{6})/i)?.[1];
  const lightStrong = engineeringTokensCss.match(/--light-strong:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(darkStrong, "expected an amber --dark-strong token");
  assert.ok(lightStrong, "expected an amber --light-strong token");
  assert.ok(contrastRatio(darkStrong, "#14191D") >= 4.5, `expected --dark-strong ${darkStrong} to meet WCAG AA contrast on the dark surface`);
  assert.ok(contrastRatio(lightStrong, "#FFFFFF") >= 4.5, `expected --light-strong ${lightStrong} to meet WCAG AA contrast on the light surface`);
});

test("uses the table-header teal independently for Mermaid nodes and leaves table-header CSS unchanged", () => {
  const rectRule = extractCssRule(engineeringTokensCss, ".engineering-mermaid .mermaid-node");
  const diamondRule = extractCssRule(engineeringTokensCss, ".engineering-mermaid .mermaid-node--diamond");
  const ellipseRule = extractCssRule(engineeringTokensCss, ".engineering-mermaid .mermaid-node--ellipse");
  assert.ok(rectRule, "expected a base mermaid node rule");
  assert.ok(diamondRule, "expected a diamond mermaid node rule");
  assert.ok(ellipseRule, "expected an ellipse mermaid node rule");
  assert.match(engineeringTokensCss, /\.engineering-card th\s*\{[^}]*background:\s*rgba\(103,\s*211,\s*194,\s*0\.14\)[^}]*color:\s*var\(--accent-strong\)[^}]*\}/i);
  assert.match(rectRule ?? "", /fill:\s*var\(--token-mermaid-node-fill\)/i);
  assert.match(rectRule ?? "", /stroke:\s*none/i, "expected nodes to render without a border");
  assert.match(diamondRule ?? "", /fill:\s*var\(--token-mermaid-node-fill-diamond\)/i);
  assert.doesNotMatch(diamondRule ?? "", /stroke:/i, "expected the diamond to carry no border");
  assert.match(ellipseRule ?? "", /fill:\s*var\(--token-mermaid-node-fill-ellipse\)/i);
  assert.doesNotMatch(ellipseRule ?? "", /stroke:/i, "expected the ellipse to carry no border");

  assert.doesNotMatch(engineeringTokensCss, /--token-mermaid-node-stroke/i, "expected per-shape border tokens to be gone");

  assert.doesNotMatch(engineeringTokensCss, /--table-header-bg|--table-header-text/i);
  assert.match(engineeringTokensCss, /--token-mermaid-node-fill:\s*rgba\(103,\s*211,\s*194,\s*0\.14\)/i);
  assert.match(engineeringTokensCss, /--token-mermaid-node-fill-diamond:\s*rgba\(103,\s*211,\s*194,\s*0\.14\)/i);
  assert.match(engineeringTokensCss, /--token-mermaid-node-fill-ellipse:\s*rgba\(103,\s*211,\s*194,\s*0\.14\)/i);
  assert.match(engineeringTokensCss, /--token-mermaid-edge:\s*var\(--(?:dark|light)-muted\)/i);

  assert.doesNotMatch(engineeringTokensCss, /--table-header-bg|--table-header-text/i);
  assert.match(engineeringTokensCss, /--token-mermaid-node-fill:\s*rgba\(103,\s*211,\s*194,\s*0\.14\)/i);
  assert.match(engineeringTokensCss, /--token-mermaid-node-fill-diamond:\s*rgba\(103,\s*211,\s*194,\s*0\.14\)/i);
  assert.match(engineeringTokensCss, /--token-mermaid-node-fill-ellipse:\s*rgba\(103,\s*211,\s*194,\s*0\.14\)/i);

  // Edges and labels reuse the presentation muted/text tokens.
  assert.match(engineeringTokensCss, /--token-mermaid-edge:\s*var\(--(?:dark|light)-muted\)/i);
  assert.match(engineeringTokensCss, /--token-mermaid-label:\s*var\(--(?:dark|light)-muted\)/i);

});

test("keeps focused-slide navigation chrome anchored to the viewport", () => {
  const slideProgressRule = extractCssRule(engineeringTokensCss, ".engineering-slide-progress");
  assert.ok(slideProgressRule, "expected a focused-slide progress CSS rule");
  assert.match(slideProgressRule ?? "", /position:\s*fixed/i, "expected slide progress to remain anchored to the viewport");
  assert.match(slideProgressRule ?? "", /left:\s*[^;]+/i, "expected slide progress in the bottom-left gutter");

  const slideCueRule = extractCssRule(engineeringTokensCss, ".engineering-slide-cue");
  assert.ok(slideCueRule, "expected a shared slide edge cue CSS rule");
  assert.match(slideCueRule ?? "", /position:\s*fixed/i, "expected slide edge cues to remain anchored to the viewport");
  assert.match(slideCueRule ?? "", /cursor:\s*pointer/i, "expected slide edge cues to be clickable prev/next controls");
  assert.doesNotMatch(slideCueRule ?? "", /pointer-events:\s*none/i, "expected slide edge cues to accept clicks");

  const focusedNeighborRule = extractCssRule(
    engineeringTokensCss,
    "body:not(:has(.step.active[data-id=\"overview\"])) .step:not(.active)",
  );
  assert.ok(focusedNeighborRule, "expected focused mode to isolate the active slide");
  assert.match(focusedNeighborRule ?? "", /visibility:\s*hidden/i, "expected neighboring slide bodies to stay outside the focused presentation frame");
});

test("wires the on-screen prev/next cues to move between slides", () => {
  const progress = engineeringProgressMarkup();
  assert.match(progress, /<button[^>]*data-slide-cue-previous[^>]*aria-label="Previous slide"/i, "expected a real Previous slide button");
  assert.match(progress, /<button[^>]*data-slide-cue-next[^>]*aria-label="Next slide"/i, "expected a real Next slide button");

  assert.match(engineeringNavigationScript, /previousCue\.addEventListener\('click'/, "expected the previous cue to be click-wired");
  assert.match(engineeringNavigationScript, /nextCue\.addEventListener\('click'/, "expected the next cue to be click-wired");
  assert.match(engineeringNavigationScript, /window\.impress\(\)\.prev\(\)/, "expected the previous cue to step backward");
  assert.match(engineeringNavigationScript, /window\.impress\(\)\.next\(\)/, "expected the next cue to step forward");
});

test("counts slides excluding the overview step so numbering starts at 1", () => {
  // The overview step is identified only by data-id="overview"; it carries no
  // "overview" class, so the slide roster must exclude it by data-id or the
  // first real slide is mislabeled #2 and the total is inflated by one.
  assert.match(
    engineeringNavigationScript,
    /querySelectorAll\('\.step:not\(\[data-id="overview"\]\)'\)/,
    "expected the slide roster to exclude the overview step by data-id",
  );
  assert.doesNotMatch(
    engineeringNavigationScript,
    /var slides = Array\.prototype\.slice\.call\(document\.querySelectorAll\('\.step:not\(\.overview\)'\)\)/,
    "expected the brittle class-based overview exclusion to be gone from the slide roster",
  );
});

test("omits the in-browser editor and live reload from the default build", () => {
  const slides: PresentationSlide[] = [
    { id: "slide-1", title: "Slide 1", content: "<p>Slide 1</p>" },
  ];
  const plain = buildPresentation(slides, { documentTitle: "Plain" });
  assert.doesNotMatch(plain, /data-editor/i, "expected the default build to omit editor markup");
  assert.doesNotMatch(plain, /id="silmaril-source"/i, "expected the default build to omit an editor source payload");
  assert.doesNotMatch(plain, /data-silmaril-refresh/i, "expected the default build to omit a refresh button");
  assert.doesNotMatch(plain, /__silmaril\/livereload/i, "expected the default build to omit the live-reload client");
});

test("centers title-only and subtitle section slides", () => {
  const slides: PresentationSlide[] = [
    { id: "architecture", title: "Architecture", kind: "section" },
    { id: "request-path", title: "Request path", kind: "section", subtitle: "Paths, storage, and recovery" },
  ];
  const html = buildPresentation(slides, { documentTitle: "Sections" });

  assert.match(
    html,
    /<div class="engineering-section" data-theme="dark">\s*<h2>Architecture<\/h2>\s*<\/div>/,
  );
  assert.match(
    html,
    /<div class="engineering-section" data-theme="dark">\s*<h2>Request path<\/h2>\s*<p class="engineering-section__subtitle">Paths, storage, and recovery<\/p>\s*<\/div>/,
  );
  assert.match(
    engineeringTokensCss,
    /\.engineering-section\s*\{[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*text-align:\s*center;/,
  );
});

test("enables the live-reload client only when requested", () => {
  const slides: PresentationSlide[] = [
    { id: "slide-1", title: "Slide 1", content: "<p>Slide 1</p>" },
  ];
  const live = buildPresentation(slides, { documentTitle: "Live", liveReload: true });
  assert.match(live, /__silmaril\/livereload/i, "expected the live-reload build to connect to the live-reload endpoint");
  assert.doesNotMatch(live, /data-editor/i, "expected live reload to add no editor markup");
  assert.doesNotMatch(live, /data-silmaril-refresh/i, "expected live reload to add no refresh button");
});

test("wraps the engineering board after five slides and centers the final row", () => {
  const slides: PresentationSlide[] = Array.from({ length: 7 }, (_, index) => ({
    id: `slide-${index + 1}`,
    title: `Slide ${index + 1}`,
    content: `<p>Slide ${index + 1}</p>`,
  }));
  const html = buildPresentation(slides, { documentTitle: "Layout" });
  const placements = [...html.matchAll(/data-x="([^"]+)" data-y="([^"]+)" data-z="0" data-id="slide-\d+"/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
  assert.deepEqual(
    placements,
    [
      { x: 0, y: 0 },
      { x: 1200, y: 0 },
      { x: 2400, y: 0 },
      { x: 3600, y: 0 },
      { x: 4800, y: 0 },
      { x: 1800, y: 900 },
      { x: 3000, y: 900 },
    ],
    "expected five slides on the first row and a centered second row",
  );
});

test("reserves viewport gutters around focused engineering slides", () => {
  const html = buildPresentation([], { documentTitle: "Gutters" });
  assert.match(html, /id="impress" data-width="1120" data-height="820"/);
});
