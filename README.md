# Silmaril

Silmaril is a trivial, no-frills Markdown-to-slides pipeline for engineers: write headings, get a deterministic single-file HTML presentation.

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

The `#` heading is the presentation title. Each `##` heading starts a slide. If the title is omitted, Silmaril uses the Markdown filename. The output opens on the whole board, works offline, and contains its scripts, styles, local images, and Mermaid diagrams.

The first paragraph directly below the `#` title is an optional plain-text subtitle. Physical line breaks inside that paragraph become multiline subtitle lines on the board overview, not on individual slides.

Slide content supports inline highlight with `==text==` and strikethrough with `~~text~~`.

Deck-wide footers can appear in the title preamble:

```markdown
:::footer left
![Logo](./logo.png) Acme Engineering
:::

:::footer right
Internal · 2026
:::
```

Each footer side is optional and accepts one inline-Markdown line. It stays fixed in the bottom-left or bottom-right corner of every overview and focused-slide view. See [the authoring guide](docs/authoring.md) for the complete footer contract.

## Present

Use the arrow keys to move between slides. Focused-slide mode shows only the active slide with quiet edge cues for available previous and next slides. The board shows `silmaril · <version>` in the lower-right corner.

Dense slides reduce font sizes and text spacing together until their content fits. Slides that already fit keep their normal sizes. If fixed content cannot fit, the card scrolls instead of silently cropping it.

## Edit with live reload

Run `silmaril serve talk.md` to open the deck in a local server with live reload. Edit the Markdown in your own editor and the browser reloads on save, so the Markdown file stays the source of truth. Rendering is full fidelity, including Mermaid.

Strong emphasis uses the same amber treatment across dark and light modes with WCAG AA contrast.

## Commands

| Command | Purpose |
| --- | --- |
| `silmaril publish <input>` | Publish a single-file HTML presentation |
| `silmaril serve <input>` | Serve the deck locally with live reload and in-browser editing |
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

`render(markdown, options)` synchronously returns `{ html, slideCount }` and supports local and embedded images. The `options` object can set `title`, `assetBaseDir`, `version`, `repositoryUrl`, or `liveReload`. Local image paths are resolved relative to `assetBaseDir`.

Use `renderAsync` when the Markdown contains HTTP or HTTPS image URLs:

```js
import { renderAsync } from "silmaril";

const { html, slideCount } = await renderAsync(
  "## Diagram\n\n![Architecture](https://example.com/architecture.png)",
);
```

`renderAsync(markdown, options)` accepts the same options and returns a Promise of `{ html, slideCount }`. It downloads remote images and embeds their bytes, so the resulting HTML works offline. CLI publish, live serve, and the Obsidian plugin use this async path internally. Image download failures stop rendering rather than producing a deck with missing images.

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
