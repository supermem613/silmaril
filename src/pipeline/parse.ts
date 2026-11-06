import type { BoardIR, SlideIR } from "./types.js";

export function parseBoard(markdown: string, fallbackTitle = "Presentation"): BoardIR {
  const title = parseTitle(markdown) ?? fallbackTitle;
  return {
    id: slugify(title),
    rawMarkdown: markdown,
    title,
    subtitle: parseSubtitle(markdown),
    footer: parseFooter(markdown),
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

function parseSubtitle(markdown: string): string | undefined {
  const lines = markdown.split(/\r?\n/);
  let titleIndex = -1;
  let slideIndex = lines.length;
  let inFence = false;
  let fenceCharacter: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const fence = lines[index].trim().match(/^(`{3,}|~{3,})/);
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
    if (titleIndex === -1 && /^#\s+/.test(lines[index])) {
      titleIndex = index;
    } else if (titleIndex !== -1 && /^##\s+/.test(lines[index])) {
      slideIndex = index;
      break;
    }
  }
  if (titleIndex === -1) {
    return undefined;
  }

  const preamble = stripFooterBlocks(lines.slice(titleIndex + 1, slideIndex));
  let start = 0;
  while (start < preamble.length && preamble[start].trim() === "") {
    start += 1;
  }
  if (start >= preamble.length) {
    return undefined;
  }

  const firstRaw = preamble[start];
  const first = firstRaw.trim();
  if (
    /^(?:>|[-+*]\s|#{1,6}\s|```|~~~| {4}\S|<!--)/.test(first)
    || /^:::\S*/.test(first)
    || /^ {4}\S/.test(firstRaw)
    || /^(?:[*_-]\s*){3,}$/.test(first)
  ) {
    return undefined;
  }

  const paragraph: string[] = [preamble[start]];
  for (let index = start + 1; index < preamble.length; index += 1) {
    const line = preamble[index];
    if (line.trim() === "") {
      break;
    }
    if (/^(?:>|[-+*]\s|#{1,6}\s|```|~~~| {4}\S|<!--)/.test(line.trim()) || /^:::\S*/.test(line.trim())) {
      break;
    }
    paragraph.push(line);
  }
  return paragraph.join("\n").trim() || undefined;
}

function stripFooterBlocks(lines: readonly string[]): string[] {
  const cleaned: string[] = [];
  let inFooter = false;
  let inFence = false;
  let fenceCharacter: string | null = null;
  for (const line of lines) {
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
      cleaned.push(line);
      continue;
    }
    if (inFence) {
      cleaned.push(line);
      continue;
    }
    if (/^:::footer\s+(left|right)\s*$/.test(line.trim())) {
      inFooter = true;
      continue;
    }
    if (inFooter && /^:::\s*$/.test(line.trim())) {
      inFooter = false;
      continue;
    }
    if (!inFooter) {
      cleaned.push(line);
    }
  }
  return cleaned;
}

function parseFooter(markdown: string): BoardIR["footer"] {
  const lines = markdown.split(/\r?\n/);
  let titleIndex = -1;
  let slideIndex = lines.length;
  let inFence = false;
  let fenceCharacter: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const fence = lines[index].trim().match(/^(`{3,}|~{3,})/);
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
    if (titleIndex === -1 && /^#\s+/.test(lines[index])) {
      titleIndex = index;
    } else if (titleIndex !== -1 && /^##\s+/.test(lines[index])) {
      slideIndex = index;
      break;
    }
  }
  if (titleIndex === -1) {
    return undefined;
  }

  const footer: { left?: string; right?: string } = {};
  let side: "left" | "right" | undefined;
  const content: string[] = [];
  inFence = false;
  fenceCharacter = null;

  for (let index = titleIndex + 1; index < slideIndex; index += 1) {
    const fence = lines[index].trim().match(/^(`{3,}|~{3,})/);
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
    const line = lines[index].trim();
    const opening = line.match(/^:::footer(?:\s+(.*))?\s*$/);
    if (opening) {
      if (side) {
        throw new Error("nested footer blocks are not allowed");
      }
      const requestedSide = (opening[1] ?? "").trim();
      if (requestedSide !== "left" && requestedSide !== "right") {
        throw new Error(`unknown footer side: ${requestedSide || "(missing)"}`);
      }
      if (footer[requestedSide]) {
        throw new Error(`duplicate footer block: ${requestedSide}`);
      }
      side = requestedSide;
      content.length = 0;
      continue;
    }
    if (side && /^:::\s*$/.test(line)) {
      const nonEmpty = content.filter((value) => value.trim() !== "");
      if (nonEmpty.length !== 1) {
        throw new Error(`footer ${side} must contain exactly one non-empty line`);
      }
      footer[side] = nonEmpty[0].trim();
      side = undefined;
      content.length = 0;
      continue;
    }
    if (side) {
      content.push(lines[index]);
    }
  }
  if (side) {
    throw new Error(`unterminated footer block: ${side}`);
  }

  return footer.left || footer.right ? footer : undefined;
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
