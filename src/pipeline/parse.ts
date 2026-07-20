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

function parseSlides(markdown: string): SlideIR[] {
  const lines = markdown.split(/\r?\n/);
  const slides: SlideIR[] = [];
  const usedIds = new Map<string, number>();
  let inFence = false;
  let fenceCharacter: string | null = null;
  let currentTitle: string | null = null;
  let bodyStart = 0;

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
    if (!heading) {
      continue;
    }

    if (currentTitle !== null) {
      slides.push(createSlide(currentTitle, lines.slice(bodyStart, index), usedIds));
    }

    currentTitle = heading[1].trim();
    bodyStart = index + 1;
  }

  if (currentTitle !== null) {
    slides.push(createSlide(currentTitle, lines.slice(bodyStart), usedIds));
  }

  return slides;
}

function createSlide(title: string, bodyLines: string[], usedIds: Map<string, number>): SlideIR {
  const baseId = slugify(title || "slide");
  const count = usedIds.get(baseId) ?? 0;
  usedIds.set(baseId, count + 1);

  return {
    id: count === 0 ? baseId : `${baseId}-${count + 1}`,
    title,
    body: bodyLines.join("\n").replace(/\n+$/, ""),
  };
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
