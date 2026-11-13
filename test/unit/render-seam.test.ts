import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as silmaril from "../../src/index.js";
import { buildPresentation } from "../../src/presentation/index.js";

describe("render export surface", () => {
  it("renders a document as natural-height scrolling HTML through both APIs", async () => {
    const markdown = [
      "# Architecture review",
      "",
      "An engineering document",
      "",
      ":::silmaril document",
      ":::",
      "",
      "## Context",
      "",
      "A long **readable** section.",
      "",
      "## Decision",
      "",
      "| Choice | Result |",
      "| --- | --- |",
      "| A | Selected |",
    ].join("\n");
    const results = [silmaril.render(markdown), await silmaril.renderAsync(markdown)];

    for (const result of results) {
      assert.equal(result.type, "document");
      assert.equal(result.slideCount, 2);
      assert.match(result.html, /<body class="engineering-document">/);
      assert.match(result.html, /data-silmaril-document/);
      assert.match(result.html, /<h1>Architecture review<\/h1>/);
      assert.match(result.html, /<h2>Context<\/h2>/);
      assert.match(result.html, /<strong>readable<\/strong>/);
      assert.match(result.html, /<table>/);
      assert.doesNotMatch(
        result.html,
        /class="[^"]*engineering-card engineering-document__section/,
      );
      assert.match(
        result.html,
        /\.engineering-document__section\s+table\s*\{[^}]*width:\s*100%;/,
      );
      assert.match(
        result.html,
        /\.engineering-document__section--section\s*\{[^}]*min-height:\s*0;/,
      );
      assert.match(
        result.html,
        /\.engineering-document__sections\s*\{[^}]*gap:\s*0\.75rem;/,
      );
      assert.match(
        result.html,
        /\.engineering-document__section\s+h2\s*\{[^}]*margin:\s*1\.25rem\s+0\s+0\.75rem;[^}]*font-size:\s*2rem;/,
      );
      assert.match(
        result.html,
        /\.engineering-document__section\s+h3\s*\{[^}]*font-size:\s*1\.35rem;/,
      );
      assert.match(
        result.html,
        /\.engineering-document__section\s+h3\s*\{[^}]*margin:\s*1\.25rem\s+0\s+0\.35rem;/,
      );
      assert.match(
        result.html,
        /\.engineering-document__section\s+table\s*\{[^}]*table-layout:\s*auto;[^}]*border-collapse:\s*collapse;/,
      );
      assert.doesNotMatch(result.html, /<div id="impress"/);
      assert.doesNotMatch(result.html, /window\.impress/);
    }
  });

  it("renders deck footers at the end of a document, never fixed to the viewport", () => {
    const markdown = [
      "# Review",
      "",
      ":::footer left",
      "**Platform** Engineering",
      ":::",
      "",
      ":::footer right",
      "Internal · 2026",
      ":::",
      "",
      ":::silmaril document",
      ":::",
      "",
      "## Context",
      "",
      "Body",
    ].join("\n");
    const result = silmaril.render(markdown);

    assert.equal(result.type, "document");
    assert.match(result.html, /<footer class="engineering-document__footer">/);
    assert.match(result.html, /engineering-document__footer--left[\s\S]*Platform/);
    assert.match(result.html, /engineering-document__footer--right[\s\S]*Internal · 2026/);
    assert.ok(result.html.indexOf("<footer class=\"engineering-document__footer\">") > result.html.indexOf("<h2>Context</h2>"));
    assert.doesNotMatch(result.html, /<div class="engineering-footer/);
    assert.doesNotMatch(result.html, /\.engineering-document__footer[\s\S]*position:\s*fixed/);
  });

  it("preserves presentation output as the default and supports an explicit presentation directive", () => {
    const implicit = silmaril.render("# Deck\n\n## First\n\nBody");
    const explicit = silmaril.render("# Deck\n\n:::silmaril presentation\n:::\n\n## First\n\nBody");

    assert.equal(implicit.type, "presentation");
    assert.equal(explicit.type, "presentation");
    assert.match(implicit.html, /<div id="impress"/);
    assert.match(explicit.html, /<div id="impress"/);
  });

  it("render is exported as a pure string-in/HTML-out function", () => {
    assert.equal(typeof silmaril.render, "function");

    const markdownString = "## Slide 1\n\nUse **strong** text.\n\n## Slide 2\n\nMore text.";
    const slideCount = (markdownString.match(/^##\s+/gm) ?? []).length;

    const firstRender = silmaril.render(markdownString, {});
    const secondRender = silmaril.render(markdownString, {});

    assert.equal(typeof firstRender.html, "string");
    assert.equal(typeof firstRender.slideCount, "number");
    assert.equal(firstRender.slideCount, slideCount);
    assert.match(firstRender.html, /<strong>strong<\/strong>/);
    assert.equal(firstRender.html, secondRender.html);
  });

  it("renders a plain-text deck subtitle through both APIs with HTML escaping", async () => {
    const markdown = '# Deck\n\nFor **authors** & <script>alert("x")</script>\n\n## First\n\nBody';
    const expected = '<p class="engineering-board-subtitle">For **authors** &amp; &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>';
    const results = [silmaril.render(markdown), await silmaril.renderAsync(markdown)];

    assert.deepEqual(
      results.map(({ html }) => html.match(/<p class="engineering-board-subtitle">.*?<\/p>/)?.[0]),
      [expected, expected],
    );
    assert.deepEqual(results.map(({ slideCount }) => slideCount), [1, 1]);
    assert.match(results[0].html, /<title>Deck<\/title>/);
    assert.equal(results[0].html, results[1].html);
  });

  it("renders multiline deck subtitles with explicit line breaks", () => {
    const { html } = silmaril.render([
      "# Deck",
      "",
      "First line",
      "Second & line",
      "",
      "## First",
      "",
      "Body",
    ].join("\n"));

    assert.match(
      html,
      /<p class="engineering-board-subtitle">First line<br>Second &amp; line<\/p>/,
    );
  });

  it("renders title-only and subtitle section slides through both APIs", async () => {
    const markdown = [
      "# Deck",
      "",
      "## Architecture",
      ":::section",
      ":::",
      "",
      "## Request path",
      ":::section",
      "Paths, **storage**, & recovery",
      ":::",
    ].join("\n");
    const results = [silmaril.render(markdown), await silmaril.renderAsync(markdown)];

    for (const result of results) {
      assert.match(
        result.html,
        /<div class="engineering-section" data-theme="dark">\s*<h2>Architecture<\/h2>\s*<\/div>/,
      );
      assert.match(
        result.html,
        /<div class="engineering-section" data-theme="dark">\s*<h2>Request path<\/h2>\s*<p class="engineering-section__subtitle">Paths, \*\*storage\*\*, &amp; recovery<\/p>\s*<\/div>/,
      );
      assert.deepEqual(result.slideCount, 2);
    }
  });

  it("renders highlight and strikethrough Markdown", () => {
    const { html } = silmaril.render("## First\n\n==Hello== and ~~removed~~");

    assert.match(html, /<mark>Hello<\/mark>/);
    assert.match(html, /<s>removed<\/s>/);
  });

  it("renders persistent bottom-left and bottom-right footer content", () => {
    const { html } = silmaril.render([
      "# Deck",
      "",
      ":::footer left",
      "**Platform** Engineering",
      ":::",
      "",
      ":::footer right",
      "Internal · 2026",
      ":::",
      "",
      "## First",
      "",
      "Body",
    ].join("\n"));

    assert.match(html, /<div class="engineering-footer engineering-footer--left"><p><strong>Platform<\/strong> Engineering<\/p>\s*<\/div>/);
    assert.match(html, /<div class="engineering-footer engineering-footer--right"><p>Internal · 2026<\/p>\s*<\/div>/);
    assert.match(html, /\.engineering-footer--left\s*\{[^}]*left: 1\.25rem;/);
    assert.match(html, /\.engineering-footer--right\s*\{[^}]*right: 1\.25rem;/);
  });

  it("renders footer scenery outside the transformed presentation canvas", () => {
    const { html } = silmaril.render([
      "# Deck",
      "",
      ":::footer left",
      "Platform Engineering",
      ":::",
      "",
      "## First",
      "",
      "Body",
    ].join("\n"));

    const bodyIndex = html.indexOf("<body");
    const footerIndex = html.indexOf('<div class="engineering-footer engineering-footer--left">');
    const impressIndex = html.indexOf('<div id="impress"');

    assert.ok(bodyIndex < footerIndex && footerIndex < impressIndex);
  });

  it("renders footer images at their intrinsic dimensions", () => {
    const { html } = silmaril.render([
      "# Deck",
      "",
      ":::footer left",
      "![Logo](data:image/png;base64,AA==)",
      ":::",
      "",
      "## First",
      "",
      "Body",
    ].join("\n"));

    assert.match(
      html,
      /\.engineering-footer img\s*\{[^}]*width: auto;[^}]*height: auto;[^}]*max-width: none;[^}]*max-height: none;/,
    );
  });

  it("embeds a fixed footer image through sync and async rendering", async () => {
    const directory = new URL("../fixtures/inline/", import.meta.url);
    const bytes = readFileSync(new URL("local.png", directory));
    const markdown = [
      "# Deck",
      "",
      ":::footer left",
      "![Logo](./local.png) Acme Engineering",
      ":::",
      "",
      "## First",
      "",
      "Body",
    ].join("\n");
    const options = { assetBaseDir: fileURLToPath(directory) };
    const results = [silmaril.render(markdown, options), await silmaril.renderAsync(markdown, options)];

    for (const result of results) {
      assert.match(
        result.html,
        new RegExp(`<div class="engineering-footer engineering-footer--left"><p><img src="data:image/png;base64,${bytes.toString("base64")}" alt="Logo">\\s*Acme Engineering</p>`),
      );
    }
  });

  it("preserves the title-only document for preambles that are not subtitle paragraphs", async () => {
    const expected = buildPresentation(
      [{ id: "first", title: "First", content: "<p>Body</p>\n" }],
      { documentTitle: "Deck" },
    );
    const preambles = [
      "# Deck",
      "# Deck\n\n> Quoted text\n\nLater paragraph",
      "# Deck\n\n- List item\n\nLater paragraph",
      "# Deck\n\n```\nExample code\n```\n\nLater paragraph",
      "# Deck\n\n    Indented code\n\nLater paragraph",
      "# Deck\n\n### Smaller heading\n\nLater paragraph",
      "# Deck\n\n<!-- comment -->\n\nLater paragraph",
      "Text before the title\n\n# Deck",
      "Text without an explicit title",
      "```\n# Code title\nCode paragraph\n```\n\n# Deck",
    ];

    for (const preamble of preambles) {
      const markdown = `${preamble}\n\n## First\n\nBody`;
      assert.deepEqual(
        [silmaril.render(markdown, { title: "Deck" }), await silmaril.renderAsync(markdown, { title: "Deck" })],
        [
          { html: expected, slideCount: 1, type: "presentation" },
          { html: expected, slideCount: 1, type: "presentation" },
        ],
        preamble,
      );
    }
  });

  it("embeds reference-style local images from parsed image tokens", () => {
    const directory = new URL("../fixtures/inline/", import.meta.url);
    const bytes = readFileSync(new URL("local.png", directory));
    const { html } = silmaril.render("## Image\n\n![Diagram][source]\n\n[source]: ./local.png", {
      assetBaseDir: fileURLToPath(directory),
    });

    assert.ok(html.includes(`<img src="data:image/png;base64,${bytes.toString("base64")}" alt="Diagram">`));
  });

  it("renders image syntax in inline and fenced code as code", () => {
    const image = "![Diagram](https://example.test/image.png)";
    const { html } = silmaril.render(`## Example\n\n\`${image}\`\n\n\`\`\`\n${image}\n\`\`\``);

    assert.ok(html.includes(`<code>${image}</code>`) && html.includes(`<pre><code>${image}\n</code></pre>`));
  });

  it("keeps an already embedded image usable", () => {
    const bytes = readFileSync(new URL("../fixtures/inline/local.png", import.meta.url));
    const source = `data:image/png;base64,${bytes.toString("base64")}`;
    const { html } = silmaril.render(`## Image\n\n![Diagram](${source})`);

    assert.ok(html.includes(`<img src="${source}" alt="Diagram">`));
  });

  it("sync and async rendering resolve the same encoded local image path", async (t) => {
    const directory = mkdtempSync(join(tmpdir(), "silmaril-image-path-"));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const image = '<svg xmlns="http://www.w3.org/2000/svg"/>';
    writeFileSync(join(directory, "diagram (final).svg"), image, "utf8");
    const markdown = "## Image\n\n![Diagram](<diagram (final).svg>)";
    const options = { assetBaseDir: directory };
    const sync = silmaril.render(markdown, options);
    const async = await silmaril.renderAsync(markdown, options);
    const expected = `data:image/svg+xml;base64,${Buffer.from(image).toString("base64")}`;

    assert.deepEqual({
      sync: sync.html.match(/<img src="([^"]+)" alt="Diagram">/)?.[1],
      async: async.html.match(/<img src="([^"]+)" alt="Diagram">/)?.[1],
    }, { sync: expected, async: expected });
  });

  it("supports opt-in wiki images through both public rendering APIs", async (t) => {
    const directory = mkdtempSync(join(tmpdir(), "silmaril-wiki-image-"));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const image = '<svg xmlns="http://www.w3.org/2000/svg"/>';
    writeFileSync(join(directory, "Example.svg"), image, "utf8");
    const markdown = "## Image\n\n![[Example.svg]]\n\n`![[Code.svg]]`";
    const options = { assetBaseDir: directory, resolveWikiImage: (reference: string) => reference };
    const results = [silmaril.render(markdown, options), await silmaril.renderAsync(markdown, options)];
    const expected = `<img src="data:image/svg+xml;base64,${Buffer.from(image).toString("base64")}" alt="Example.svg">`;

    assert.deepEqual(results.map(({ html }) => html.match(/<img [^>]+>/)?.[0]), [expected, expected]);
    assert.ok(results.every(({ html }) => html.includes("<code>![[Code.svg]]</code>")));
    assert.ok(silmaril.render(markdown).html.includes("<p>![[Example.svg]]</p>"));
  });
});
