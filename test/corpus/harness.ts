import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const corpusDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "parse");

export function canonicalizeHtml(source: string): string {
  return source.replace(/\r\n?/g, "\n");
}

export function compareToPrototype(rendered: string, prototype: string): boolean {
  const renderedCanonical = canonicalizeHtml(rendered);
  const prototypeCanonical = canonicalizeHtml(prototype);
  return Buffer.from(renderedCanonical, "utf8").equals(Buffer.from(prototypeCanonical, "utf8"));
}

export function extractSpatialTransforms(stepMarkup: string): { x: number; y: number; scale: number; rotate: number } {
  const match = stepMarkup.match(/<div[^>]*class=["']assembled-step["'][^>]*>([\s\S]*?)<\/div>\s*$/i);
  const body = match?.[1] ?? stepMarkup;
  const readNumber = (name: string): number => {
    const attributeMatch = body.match(new RegExp(`data-${name}=["']([^"']+)["']`, "i"));
    return attributeMatch ? Number(attributeMatch[1]) : 0;
  };

  return {
    x: readNumber("x"),
    y: readNumber("y"),
    scale: readNumber("scale"),
    rotate: readNumber("rotate"),
  };
}

export function loadCase(name: string): { name: string; source: string; path: string } {
  const fixturePath = resolve(corpusDir, `${name}.md`);
  if (!existsSync(fixturePath)) {
    throw new Error(`Unknown corpus case: ${name}`);
  }

  return {
    name,
    source: readFileSync(fixturePath, "utf8"),
    path: fixturePath,
  };
}
