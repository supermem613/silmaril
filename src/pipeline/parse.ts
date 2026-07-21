import type { BoardIR, SlideIR } from "./types.js";

export function parseBoard(markdown: string, fallbackTitle = "Presentation"): BoardIR {
  const title = parseTitle(markdown) ?? fallbackTitle;
  return {
    id: slugify(title),
    rawMarkdown: markdown,
    title,
    slides: parseSlides(markdown),
  };
}

function parseTitle(markdown: string): string | null {
  for (const line of linesOutsideFences(markdown)) {
    const match = line.match(/^#\s+(.*)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

export interface SlideRange {
  readonly id: string;
  readonly title: string;
  readonly headingIndex: number;
  readonly bodyStart: number;
  readonly contentEnd: number;
  readonly regionEnd: number;
}

// Single source of truth for how markdown splits into slides. Both the parsed
// board and the in-place editor write-back derive slide ids and boundaries from
// here so a slide id always maps back to the same source region.
export function slideRanges(markdown: string): SlideRange[] {
  const lines = markdown.split(/\r?\n/);
  const headings: Array<{ index: number; title: string }> = [];
  let inFence = false;
  let fenceCharacter: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.trim().match(/^(`{3,}|~{3,})/);
    if (fence) {
      const character = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceCharacter = character;
      } else if (fenceCharacter === character) {
        inFence = false;
        fenceCharacter = null;
      }
      continue;
    }

    if (inFence) {
      continue;
    }

    const heading = line.match(/^##\s+(.*)$/);
    if (heading) {
      headings.push({ index, title: heading[1].trim() });
    }
  }

  const usedIds = new Map<string, number>();
  return headings.map((heading, order) => {
    const baseId = slugify(heading.title || "slide");
    const count = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    const bodyStart = heading.index + 1;
    const regionEnd = order + 1 < headings.length ? headings[order + 1].index : lines.length;
    let contentEnd = bodyStart;
    for (let index = bodyStart; index < regionEnd; index += 1) {
      if (lines[index].trim() !== "") {
        contentEnd = index + 1;
      }
    }

    return { id, title: heading.title, headingIndex: heading.index, bodyStart, contentEnd, regionEnd };
  });
}

function parseSlides(markdown: string): SlideIR[] {
  const lines = markdown.split(/\r?\n/);
  return slideRanges(markdown).map((range) => ({
    id: range.id,
    title: range.title,
    body: lines.slice(range.bodyStart, range.regionEnd).join("\n").replace(/\n+$/, ""),
  }));
}

// Rewrites only the body of one slide, leaving frontmatter, the title, every
// other slide, and inter-slide blank lines untouched. Replacing a slide body
// with its own current value is a no-op, so repeated autosaves do not drift.
export function replaceSlideBody(markdown: string, slideId: string, newBody: string): string {
  const target = slideRanges(markdown).find((range) => range.id === slideId);
  if (!target) {
    throw new Error(`unknown slide: ${slideId}`);
  }

  const eol = markdown.includes("\r\n") ? "\r\n" : "\n";
  const lines = markdown.split(/\r?\n/);
  const newBodyLines = newBody.replace(/\r\n?/g, "\n").split("\n");
  const next = [
    ...lines.slice(0, target.bodyStart),
    ...newBodyLines,
    ...lines.slice(target.contentEnd),
  ];
  return next.join(eol);
}

function linesOutsideFences(markdown: string): string[] {
  const lines: string[] = [];
  let inFence = false;
  let fenceCharacter: string | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const fence = line.trim().match(/^(`{3,}|~{3,})/);
    if (fence) {
      const character = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceCharacter = character;
      } else if (fenceCharacter === character) {
        inFence = false;
        fenceCharacter = null;
      }
      continue;
    }

    if (!inFence) {
      lines.push(line);
    }
  }

  return lines;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "presentation";
}
