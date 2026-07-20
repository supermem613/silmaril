import MarkdownIt from "markdown-it";
import { type BoardIR, type CanvasAttrs, type RegionAttrs, type RegionGroupAttrs, type SceneAttrs, type SceneIR, type SceneRegionIR } from "./types.js";

const markdownIt = new MarkdownIt({ html: false });

export function parseScene(markdown: string): SceneIR {
  const { content, attrs } = parseFrontmatter(markdown);
  const regions = parseRegions(content);
  const sceneAttrs = attrs as SceneAttrs;
  const title = sceneAttrs.title ?? "Scene";
  const theme = sceneAttrs.theme ?? null;
  const canvas = sceneAttrs.canvas ?? null;

  const scene: SceneIR = {
    id: slugify(title),
    rawMarkdown: markdown,
    attrs: sceneAttrs,
    groupId: null,
    theme,
    canvas,
    regions,
  };

  return scene;
}

export function parseHeadingBoard(markdown: string, fallbackTitle?: string): BoardIR {
  const { content, attrs } = parseFrontmatter(markdown);
  const boardTitle = parseBoardTitle(content) ?? fallbackTitle ?? attrs.title ?? "Board";
  const slides = parseHeadingBoardRegions(content);
  const sceneAttrs: SceneAttrs = { ...attrs, title: boardTitle };
  const theme = sceneAttrs.theme ?? null;
  const canvas = sceneAttrs.canvas ?? null;

  const scene: BoardIR = {
    id: slugify(boardTitle),
    rawMarkdown: markdown,
    attrs: sceneAttrs,
    groupId: null,
    theme,
    canvas,
    regions: slides,
    title: boardTitle,
    slides,
  };

  return scene;
}

export const parseBoard = parseHeadingBoard;

function parseBoardTitle(markdown: string): string | null {
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  let fenceChar: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = marker;
      } else if (fenceChar === marker) {
        inFence = false;
        fenceChar = null;
      }
      continue;
    }

    if (inFence) {
      continue;
    }

    const match = line.match(/^#\s+(.*)$/);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function parseHeadingBoardRegions(markdown: string): SceneRegionIR[] {
  const lines = markdown.split(/\r?\n/);
  const regions: SceneRegionIR[] = [];
  const usedIds = new Map<string, number>();
  let inFence = false;
  let fenceChar: string | null = null;
  let currentTitle: string | null = null;
  let sectionStart = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = marker;
      } else if (fenceChar === marker) {
        inFence = false;
        fenceChar = null;
      }
      continue;
    }

    if (inFence) {
      continue;
    }

    const headingMatch = line.match(/^##\s+(.*)$/);
    if (!headingMatch) {
      continue;
    }

    if (currentTitle !== null) {
      const body = lines.slice(sectionStart, index).join("\n").replace(/\n+$/, "");
      regions.push(createHeadingBoardRegion(currentTitle, body, usedIds));
    }

    currentTitle = headingMatch[1].trim();
    sectionStart = index + 1;
  }

  if (currentTitle !== null) {
    const body = lines.slice(sectionStart).join("\n").replace(/\n+$/, "");
    regions.push(createHeadingBoardRegion(currentTitle, body, usedIds));
  }

  return regions;
}

function createHeadingBoardRegion(title: string, body: string, usedIds: Map<string, number>): SceneRegionIR {
  return {
    id: createHeadingBoardId(title, usedIds),
    title,
    attrs: {},
    body,
    groupId: null,
    children: [],
  };
}

function createHeadingBoardId(title: string, usedIds: Map<string, number>): string {
  const baseId = slugify(title || "slide");
  const count = usedIds.get(baseId) ?? 0;
  const nextId = count === 0 ? baseId : `${baseId}-${count + 1}`;
  usedIds.set(baseId, count + 1);
  return nextId;
}

function parseFrontmatter(markdown: string): { content: string; attrs: SceneAttrs } {
  const trimmed = markdown.replace(/^\uFEFF/, "");
  const lines = trimmed.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { content: trimmed, attrs: {} };
  }

  let endIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      endIndex = index;
      break;
    }
  }

  if (endIndex < 0) {
    return { content: trimmed, attrs: {} };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const parsed = parseFrontmatterBlock(frontmatterLines);
  const attrs: SceneAttrs = {};

  if (typeof parsed.title === "string") {
    attrs.title = parsed.title;
  }
  if (typeof parsed.theme === "string") {
    attrs.theme = parsed.theme;
  }
  const canvasValue = parsed.canvas;
  if (canvasValue && typeof canvasValue === "object") {
    const canvasAttrs: CanvasAttrs = {};
    const canvasObject = canvasValue as Record<string, unknown>;
    if (typeof canvasObject.width === "number") {
      canvasAttrs.width = canvasObject.width;
    }
    if (typeof canvasObject.height === "number") {
      canvasAttrs.height = canvasObject.height;
    }
    attrs.canvas = canvasAttrs;
  }

  return {
    content: lines.slice(endIndex + 1).join("\n"),
    attrs,
  };
}

function parseFrontmatterBlock(lines: string[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; container: Record<string, unknown> }> = [{ indent: -1, container: root }];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const indent = countIndent(line);
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const match = trimmed.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const parent = stack[stack.length - 1].container;
    if (rawValue === undefined || rawValue === "") {
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, container: child });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }

  return root;
}

function parseScalar(rawValue: string): string | number | boolean | null {
  const trimmed = rawValue.trim();
  if (trimmed === "") {
    return "";
  }
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed === "null" || trimmed === "~") {
    return null;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseRegions(markdown: string): SceneRegionIR[] {
  const lines = markdown.split(/\r?\n/);
  const regions: SceneRegionIR[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (!match) {
      index += 1;
      continue;
    }

    const indent = countIndent(line);
    const parsed = parseRegion(lines, index, indent);
    regions.push(parsed.region);
    index = parsed.nextIndex;
  }

  return regions;
}

function parseRegion(lines: string[], startIndex: number, indent: number): { region: SceneRegionIR; nextIndex: number } {
  const line = lines[startIndex];
  const title = (line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/)?.[3] ?? "").trim();
  const region: SceneRegionIR = {
    id: slugify(title || "region"),
    title,
    attrs: {},
    body: "",
    groupId: null,
    children: [],
  };

  let cursor = startIndex + 1;
  const bodyLines: string[] = [];
  const attrs: RegionAttrs = {};

  while (cursor < lines.length) {
    const currentLine = lines[cursor];
    const trimmed = currentLine.trim();
    const currentIndent = countIndent(currentLine);

    if (!trimmed) {
      bodyLines.push(currentLine);
      cursor += 1;
      continue;
    }

    if (currentIndent <= indent) {
      break;
    }

    const explicitMatch = currentLine.match(/^\s*(?:[-*+]|\d+\.)\s+@silmaril:(?:\s*(.*))?$/);
    if (explicitMatch) {
      const nested = parseSilmarilAttributeBlock(lines, cursor + 1, currentIndent);
      Object.assign(attrs, nested.attrs);
      cursor = nested.nextIndex;
      continue;
    }

    const attrMatch = currentLine.match(/^\s*(?:[-*+]|\d+\.)\s+([^:]+):(?:\s*(.*))?$/);
    if (attrMatch) {
      const key = attrMatch[1].trim();
      if (isSupportedRegionAttributeKey(key)) {
        const rawValue = attrMatch[2]?.trim();
        if (key === "group") {
          const nested = parseGroupAttributeBlock(lines, cursor + 1, currentIndent);
          attrs.group = nested.attrs;
          cursor = nested.nextIndex;
        } else {
          const numericValue = parseNumericAttribute(rawValue ?? "");
          if (numericValue !== undefined) {
            attrs[key] = numericValue;
          }
          cursor += 1;
        }
        continue;
      }
    }

    bodyLines.push(currentLine);
    cursor += 1;
  }

  region.attrs = attrs;
  if (attrs.group) {
    if (typeof attrs.group.id === "string") {
      region.groupId = attrs.group.id;
    }
  }
  region.body = bodyLines.join("\n").trim();
  if (region.body) {
    markdownIt.parse(region.body, {});
  }

  return { region, nextIndex: cursor };
}

function parseSilmarilAttributeBlock(lines: string[], startIndex: number, baseIndent: number): { attrs: RegionAttrs; nextIndex: number } {
  const attrs: RegionAttrs = {};
  let cursor = startIndex;

  while (cursor < lines.length) {
    const currentLine = lines[cursor];
    const trimmed = currentLine.trim();
    if (!trimmed) {
      cursor += 1;
      continue;
    }

    const currentIndent = countIndent(currentLine);
    if (currentIndent <= baseIndent) {
      break;
    }

    const attrMatch = currentLine.match(/^\s*(?:[-*+]|\d+\.)\s+([^:]+):(?:\s*(.*))?$/);
    if (!attrMatch) {
      break;
    }

    const key = attrMatch[1].trim();
    if (key === "group") {
      const nested = parseGroupAttributeBlock(lines, cursor + 1, currentIndent);
      attrs.group = nested.attrs;
      cursor = nested.nextIndex;
      continue;
    }

    if (!isSupportedRegionAttributeKey(key)) {
      break;
    }

    const rawValue = attrMatch[2]?.trim();
    const numericValue = parseNumericAttribute(rawValue ?? "");
    if (numericValue !== undefined) {
      attrs[key] = numericValue;
    }
    cursor += 1;
  }

  return { attrs, nextIndex: cursor };
}

function parseGroupAttributeBlock(lines: string[], startIndex: number, baseIndent: number): { attrs: RegionGroupAttrs; nextIndex: number } {
  const attrs: RegionGroupAttrs = {};
  let cursor = startIndex;

  while (cursor < lines.length) {
    const currentLine = lines[cursor];
    const trimmed = currentLine.trim();
    if (!trimmed) {
      cursor += 1;
      continue;
    }

    const currentIndent = countIndent(currentLine);
    if (currentIndent <= baseIndent) {
      break;
    }

    const attrMatch = currentLine.match(/^\s*(?:[-*+]|\d+\.)\s+([^:]+):(?:\s*(.*))?$/);
    if (!attrMatch) {
      break;
    }

    const key = attrMatch[1].trim();
    const rawValue = attrMatch[2]?.trim();
    if (key === "id") {
      if (typeof rawValue === "string" && rawValue.length > 0) {
        attrs.id = rawValue;
      }
      cursor += 1;
      continue;
    }

    if (!isSupportedGroupAttributeKey(key)) {
      break;
    }

    const numericValue = parseNumericAttribute(rawValue ?? "");
    switch (key) {
      case "x":
        if (numericValue !== undefined) {
          attrs.x = numericValue;
        }
        break;
      case "y":
        if (numericValue !== undefined) {
          attrs.y = numericValue;
        }
        break;
      case "scale":
        if (numericValue !== undefined) {
          attrs.scale = numericValue;
        }
        break;
      case "rotate":
        if (numericValue !== undefined) {
          attrs.rotate = numericValue;
        }
        break;
      default:
        break;
    }
    cursor += 1;
  }

  return { attrs, nextIndex: cursor };
}

function parseNumericAttribute(rawValue: string | undefined): number | undefined {
  if (rawValue === undefined) {
    return undefined;
  }
  const parsed = parseScalar(rawValue);
  return typeof parsed === "number" ? parsed : undefined;
}

function isSupportedRegionAttributeKey(value: string): value is "x" | "y" | "scale" | "rotate" | "group" {
  return value === "x" || value === "y" || value === "scale" || value === "rotate" || value === "group";
}

function isSupportedGroupAttributeKey(value: string): value is "id" | "x" | "y" | "scale" | "rotate" {
  return value === "id" || value === "x" || value === "y" || value === "scale" || value === "rotate";
}

function countIndent(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "scene";
}
