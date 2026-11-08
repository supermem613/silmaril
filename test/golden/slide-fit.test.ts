import assert from "node:assert/strict";
import test from "node:test";
import { buildPresentation } from "../../src/presentation/index.js";
import { engineeringTokensCss } from "../../src/presentation/tokens.css.js";

function extractCssRule(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "i"));
  return match?.[1] ?? null;
}

function pxValue(rule: string, property: string): number | null {
  const match = rule.match(new RegExp(`${property}:\\s*(\\d+(?:\\.\\d+)?)px`, "i"));
  return match ? Number(match[1]) : null;
}

// A single deep flowchart renders far taller than the stage when nothing caps it,
// so the card must bound its own height and let inner content shrink to fit.
test("a slide card stays within the stage so content can never blow the slide size", () => {
  const html = buildPresentation(
    [
      {
        id: "deep",
        title: "Deep flowchart",
        content:
          '<svg class="engineering-mermaid" viewBox="0 0 600 860" role="img" aria-label="Mermaid diagram"></svg>',
      },
    ],
    { documentTitle: "Fit" },
  );

  const stageMatch = html.match(/data-height="(\d+)"/);
  assert.ok(stageMatch, "expected the impress stage to declare a fixed height");
  const stageHeight = Number(stageMatch[1]);
  assert.ok(stageHeight > 0, "expected a positive stage height");

  const cardRule = extractCssRule(engineeringTokensCss, ".engineering-card");
  assert.ok(cardRule, "expected the shared engineering card rule");
  const cardMaxHeight = pxValue(cardRule ?? "", "max-height");
  assert.ok(cardMaxHeight !== null, "expected .engineering-card to cap its height with max-height");
  assert.ok(
    (cardMaxHeight ?? Infinity) <= stageHeight,
    `expected card max-height ${cardMaxHeight} to fit within the ${stageHeight} stage`,
  );
  assert.match(
    cardRule ?? "",
    /overflow:\s*hidden/i,
    "expected the card to contain overflowing content within its box",
  );

  const mermaidRule = extractCssRule(engineeringTokensCss, ".engineering-mermaid");
  assert.ok(mermaidRule, "expected the mermaid figure rule");
  const mermaidMaxHeight = pxValue(mermaidRule ?? "", "max-height");
  assert.ok(
    mermaidMaxHeight !== null,
    "expected the mermaid figure to cap its height so tall diagrams scale down to fit",
  );
  assert.ok(
    (mermaidMaxHeight ?? Infinity) < (cardMaxHeight ?? 0),
    "expected the diagram cap to leave room for the slide heading and text",
  );
  assert.match(
    mermaidRule ?? "",
    /min-height:\s*0/i,
    "expected the mermaid figure to be allowed to shrink below its intrinsic height",
  );
  assert.match(
    mermaidRule ?? "",
    /flex-shrink:\s*0/i,
    "expected the mermaid figure to keep its intrinsic height in the slide flex column",
  );
  assert.match(
    mermaidRule ?? "",
    /width:\s*(?:auto|max-content)/i,
    "expected compact Mermaid diagrams to keep their intrinsic width instead of filling the whole card",
  );
  assert.match(
    mermaidRule ?? "",
    /max-width:\s*100%/i,
    "expected wide Mermaid diagrams to cap to the card width",
  );
});
