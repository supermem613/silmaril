# Authoring presentations

Silmaril turns ordinary headings into slides.

````markdown
# Architecture review

How requests move from the gateway to storage

## Request path

1. The gateway authenticates the caller.
2. The API validates the request.
3. The worker persists the result.

## Failure handling

```mermaid
flowchart LR
  Request --> API
  API --> Queue
  Queue --> Worker
```
````

## Structure

- Use one optional `#` heading for the presentation title.
- Put an optional subtitle paragraph directly below that title, before the first slide.
- Use a `##` heading for every slide.
- Put the slide body below its heading.
- Repeated slide titles receive stable numbered identifiers in source order.
- Headings inside fenced code blocks remain code.

When the `#` heading is omitted, the Markdown filename becomes the title.

The subtitle is the first paragraph after the title, with blank lines allowed between them. Wrapped lines in that paragraph are joined with spaces. It is plain text, like the title: Markdown formatting and HTML are displayed literally. Lists, quotes, code blocks, and headings do not become subtitles. Later preamble paragraphs are not included.

The board overview shows the subtitle below the title in smaller, muted text. Long text wraps, and the overview fits the heading and slide cards without overlap. Subtitles do not change the browser title, slide count, or focused-slide view.

## Slide content

Slide bodies support paragraphs, lists, tables, emphasis, images, syntax-highlighted code, and Mermaid diagrams. Raw HTML is escaped. Local images are embedded in the HTML output. HTTP and HTTPS image URLs are downloaded and embedded during publish or preview, so the presentation remains self-contained. Links to websites open in a new tab.

```markdown
![Architecture](https://example.com/architecture.png)
```

Inline images and reference-style images are supported, including inside columns. Image syntax inside code remains code. Supported image types are PNG, JPEG, GIF, SVG, WebP, and AVIF. Remote servers must return a supported image `Content-Type`; a page URL that returns HTML is not an image URL. URL query strings are preserved, and redirects are followed.

Each render loads a remote URL once and reuses its bytes across slides. Later renders fetch it again, so a changed remote image can change the output. A failed download, unsupported media type, or empty response stops rendering with an error. Publish leaves an existing output file unchanged if image loading fails.

You can also author two equal-width columns with a copy-paste block:

```markdown
:::columns
Left column body with paragraphs, lists, and emphasis.

---

Right column body with its own Markdown, including nested lists and code blocks.
:::
```

Inside a `:::columns` block, a top-level `---` is a column divider rather than a thematic break or horizontal rule. Each column can contain recursive Markdown bodies, and the layout stacks on narrow screens and print output.

### Content fitting

When a slide overflows, Silmaril reduces its heading, body fonts, and text spacing by one shared factor. It measures the result after text wraps and keeps the largest factor that fits the existing card. Slides that already fit keep their normal sizes. Images and diagrams shrink within the available space.

Fitting runs again after content edits, image and font loads, and window size changes. Removing excess content restores normal sizes. There is no minimum font size, so very dense slides can become difficult to read. Split them into more slides for a larger font. If fixed content, such as a table's borders, cannot fit at any font size, the card scrolls instead of cropping it.

## Publish

```sh
node dist/cli.js publish talk.md
node dist/cli.js publish talk.md --out talk.html
node dist/cli.js publish talk.md --open
```

Without `--out`, Silmaril writes `<source-name>.html` to the system temp directory.

## Present

The presentation starts on the whole-board overview. Arrow keys move through slides. Focused-slide mode isolates the active slide and shows quiet edge cues when another slide exists in that direction. The board signature is `silmaril · <version>`.

## Edit with live reload

```sh
node dist/cli.js serve talk.md
node dist/cli.js serve talk.md --port 4000
node dist/cli.js serve talk.md --open
```

`serve` (`silmaril serve`) starts a local server with live reload on port 5173 by default. Edit the Markdown in your own editor and the browser reloads on save, so the file stays the source of truth. Rendering is full fidelity, including Mermaid. Strong emphasis uses an amber color with WCAG AA contrast in both display modes.

## Library API

If you want to render a Markdown string from another program, import `render` from `silmaril` and pass the content in memory:

```js
import { render } from "silmaril";

const markdown = "# Review\n\n## Context\n\nRender this from memory.";
const { html, slideCount } = render(markdown, {
  title: "Review deck",
  assetBaseDir: "/assets",
});
```

`render(markdown, options)` synchronously returns `{ html, slideCount }` and supports local and embedded images. The options object can include `title`, `assetBaseDir`, `version`, `repositoryUrl`, and `liveReload`. Local image paths are resolved relative to `assetBaseDir`.

For remote images, use the additive async API:

```js
import { renderAsync } from "silmaril";

const { html, slideCount } = await renderAsync(
  "## Diagram\n\n![Architecture](https://example.com/architecture.png)",
);
```

`renderAsync(markdown, options)` accepts the same options and returns a Promise of `{ html, slideCount }`. CLI publish, live serve, and the Obsidian plugin await this shared path internally. Existing synchronous `render()` callers do not need to change.
