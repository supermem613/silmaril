import MarkdownIt from "markdown-it";
import { type CanvasAttrs, type SceneAttrs, type SceneIR, type SceneRegionIR } from "./types.js";

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
  const attrs: Record<string, unknown> = {};

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

    const attrMatch = currentLine.match(/^\s*(?:[-*+]|\d+\.)\s+([^:]+):(?:\s*(.*))?$/);
    if (attrMatch) {
      const key = attrMatch[1].trim();
      const rawValue = attrMatch[2]?.trim();
      if (rawValue === undefined || rawValue === "") {
        const nested = parseAttributeBlock(lines, cursor + 1, currentIndent);
        attrs[key] = nested.attrs;
        cursor = nested.nextIndex;
      } else {
        attrs[key] = parseScalar(rawValue);
        cursor += 1;
      }
      continue;
    }

    bodyLines.push(currentLine);
    cursor += 1;
  }

  region.attrs = attrs;
  if (typeof attrs.group === "object" && attrs.group !== null) {
    const groupAttrs = attrs.group as Record<string, unknown>;
    if (typeof groupAttrs.id === "string") {
      region.groupId = groupAttrs.id;
    }
  }
  region.body = bodyLines.join("\n").trim();
  if (region.body) {
    markdownIt.parse(region.body, {});
  }

  return { region, nextIndex: cursor };
}

function parseAttributeBlock(lines: string[], startIndex: number, baseIndent: number): { attrs: Record<string, unknown>; nextIndex: number } {
  const attrs: Record<string, unknown> = {};
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
    if (rawValue === undefined || rawValue === "") {
      const nested = parseAttributeBlock(lines, cursor + 1, currentIndent);
      attrs[key] = nested.attrs;
      cursor = nested.nextIndex;
    } else {
      attrs[key] = parseScalar(rawValue);
      cursor += 1;
    }
  }

  return { attrs, nextIndex: cursor };
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
