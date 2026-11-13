# Silmaril

Silmaril is a deterministic Markdown pipeline for engineers: write headings, get a presentation or a single-page scrolling document.

```markdown
# Service rollout

The plan for the final traffic cohort

## Current state

The new API serves 80% of traffic.

## Next step

Move the final cohort after the error budget review.
```

```sh
npm install
npm run build
node dist/cli.js publish talk.md --out talk.html
```

The `#` heading is the output title. Each `##` heading starts a slide or a document section. If the title is omitted, Silmaril uses the Markdown filename. A presentation opens on the whole board; a document opens as a continuous scroll. Both work offline and contain their scripts, styles, local images, and Mermaid diagrams.

## Choose the output type

Without an output directive, Silmaril produces a presentation. Add a document-wide directive to produce a continuous scrolling document instead:

```markdown
# Architecture review

:::silmaril document
:::

## Context

Natural-height document content.
```

Use `:::silmaril presentation` for an explicit presentation, or omit the directive to keep the existing presentation default. The directive belongs in the title preamble before the first `##` heading. It is mutually exclusive and must contain no other text.

The first paragraph directly below the `#` title is an optional plain-text subtitle. Physical line breaks inside that paragraph become multiline subtitle lines on the board overview, not on individual slides.

Slide content supports inline highlight with `==text==` and strikethrough with `~~text~~`.

To make a centered section slide, add a `:::section` block below the slide heading:

```markdown
## Architecture
:::section
Paths, storage, and recovery
:::
```

Leave the block empty for a title-only section slide:

```markdown
## Architecture
:::section
:::
```

The section subtitle is plain text. It supports line breaks but not Markdown formatting.

Deck-wide footers can appear in the title preamble:

```markdown
:::footer left
![Logo](./logo.png) Acme Engineering
:::

:::footer right
Internal · 2026
:::
```

Each footer side is optional and accepts one inline-Markdown line. In presentation output, it stays fixed in the bottom-left or bottom-right viewport corner. In document output, it appears once at the end of the document in normal flow. See [the authoring guide](docs/authoring.md) for the complete footer contract.

## Present

Use the arrow keys to move between slides. Focused-slide mode shows only the active slide with quiet edge cues for available previous and next slides. The board shows `silmaril · <version>` in the lower-right corner.

Dense slides reduce font sizes and text spacing together until their content fits. Slides that already fit keep their normal sizes. If fixed content cannot fit, the card scrolls instead of silently cropping it.

Document output does not run slide navigation or fit fixed cards. Its `##` sections use natural height and scroll in the normal browser viewport.

## Edit with live reload

Run `silmaril serve talk.md` to open the deck in a local server with live reload. Edit the Markdown in your own editor and the browser reloads on save, so the Markdown file stays the source of truth. Rendering is full fidelity, including Mermaid.

Strong emphasis uses the same amber treatment across dark and light modes with WCAG AA contrast.

## Commands

| Command | Purpose |
| --- | --- |
| `silmaril publish <input>` | Publish a single-file HTML presentation or document |
| `silmaril serve <input>` | Serve a presentation or document locally with live reload |
| `silmaril doctor` | Verify the local environment |
| `silmaril schema` | Print the machine-readable command catalog |
| `silmaril update` | Pull, install, and rebuild the checkout |

`publish` accepts `--out <file>` and `--open`. Without `--out`, the HTML is written to the system temp directory. `serve` accepts `--port <port>` (default 5173) and `--open`.

See [the authoring guide](docs/authoring.md) for supported Markdown and [the schema guide](docs/schema.md) for command output. The authoring guide also documents `:::columns` blocks for side-by-side authoring.

## Use as a library

If you want to render an in-memory Markdown string from another application, import `render` from `silmaril` and call it directly:

```js
import { render } from "silmaril";

const markdown = "# Demo\n\n## Slide one\n\nHello from a library call.";
const { html, slideCount } = render(markdown, {
  title: "Demo deck",
  assetBaseDir: "/assets",
});

console.log(slideCount);
```

`render(markdown, options)` synchronously returns `{ html, slideCount, type }` and supports local and embedded images. `type` is `"presentation"` or `"document"`. The `options` object can set `title`, `assetBaseDir`, `version`, `repositoryUrl`, or `liveReload`. Local image paths are resolved relative to `assetBaseDir`.

Use `renderAsync` when the Markdown contains HTTP or HTTPS image URLs:

```js
import { renderAsync } from "silmaril";

const { html, slideCount } = await renderAsync(
  "## Diagram\n\n![Architecture](https://example.com/architecture.png)",
);
```

`renderAsync(markdown, options)` accepts the same options and returns a Promise of `{ html, slideCount, type }`. It downloads remote images and embeds their bytes, so the resulting HTML works offline. CLI publish, live serve, and the Obsidian plugin use this async path internally. Image download failures stop rendering rather than producing a missing-image output.

## Obsidian plugin

Preview a Silmaril deck beside the Obsidian editor, with the preview following
your cursor from slide to slide as you write. See
[obsidian/README.md](obsidian/README.md) for install and usage.

## Development

```sh
npm test
npm run lint
npm run build
```
