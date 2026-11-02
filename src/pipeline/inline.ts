import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

export const SILMARIL_NOT_IMPLEMENTED_INLINE = "SILMARIL_NOT_IMPLEMENTED_INLINE";

export interface InlineResult {
  markdown: string;
}

function isRemoteReference(reference: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference);
}

function normalizeReference(reference: string): string {
  const trimmed = reference.trim();
  const withoutBraces = trimmed.replace(/^<|>$/g, '');
  const withoutHash = withoutBraces.split('#')[0] ?? withoutBraces;
  const withoutQuery = withoutHash.split('?')[0] ?? withoutHash;
  return withoutQuery;
}

function inferMimeType(resolvedPath: string): string {
  const lowerPath = resolvedPath.toLowerCase();
  if (lowerPath.endsWith('.png')) {
    return 'image/png';
  }
  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lowerPath.endsWith('.gif')) {
    return 'image/gif';
  }
  if (lowerPath.endsWith('.svg')) {
    return 'image/svg+xml';
  }
  if (lowerPath.endsWith('.webp')) {
    return 'image/webp';
  }
  if (lowerPath.endsWith('.avif')) {
    return 'image/avif';
  }
  if (lowerPath.endsWith('.woff')) {
    return 'font/woff';
  }
  if (lowerPath.endsWith('.woff2')) {
    return 'font/woff2';
  }
  if (lowerPath.endsWith('.ttf')) {
    return 'font/ttf';
  }
  if (lowerPath.endsWith('.otf')) {
    return 'font/otf';
  }

  return 'application/octet-stream';
}

function resolveAssetPath(reference: string, baseDirectory: string): string {
  const assetPath = decodeURIComponent(normalizeReference(reference));
  if (isAbsolute(assetPath)) {
    return assetPath;
  }

  return resolve(baseDirectory, assetPath);
}

export function inlineImage(reference: string, baseDirectory: string): string {
  if (/^data:image\/(?:png|jpeg|gif|svg\+xml|webp|avif);base64,[a-z\d+/=]+$/i.test(reference)) {
    return reference;
  }

  const normalizedReference = normalizeReference(reference);
  if (isRemoteReference(normalizedReference)) {
    throw new Error(`Remote asset reference is not allowed: ${normalizedReference}`);
  }

  const resolvedPath = resolveAssetPath(normalizedReference, baseDirectory);
  const assetBytes = readFileSync(resolvedPath);
  return `data:${inferMimeType(resolvedPath)};base64,${assetBytes.toString('base64')}`;
}

async function fetchImage(reference: string): Promise<string> {
  try {
    const response = await fetch(reference);
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`HTTP ${response.status}`);
    }

    const mimeType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!/^image\/(?:png|jpeg|gif|svg\+xml|webp|avif)$/.test(mimeType)) {
      await response.body?.cancel();
      throw new Error(`unsupported image media type ${mimeType || "(missing)"}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error("empty image response");
    }
    return `data:${mimeType};base64,${bytes.toString("base64")}`;
  } catch (error) {
    throw new Error(`Unable to load image ${reference}: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    });
  }
}

export function createAsyncImageResolver(baseDirectory: string): (source: string) => Promise<string> {
  const images = new Map<string, Promise<string>>();
  return (source) => {
    let image = images.get(source);
    if (!image) {
      image = /^https?:\/\//i.test(source)
        ? fetchImage(source)
        : Promise.resolve().then(() => inlineImage(source, baseDirectory));
      images.set(source, image);
    }
    return image;
  };
}

export function inlineMarkdown(markdown: string, baseDirectory = process.cwd()): InlineResult {
  const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  const updatedMarkdown = markdown.replace(imagePattern, (_fullMatch, altText, reference) => {
    return `![${altText}](${inlineImage(reference, baseDirectory)})`;
  });

  return { markdown: updatedMarkdown };
}
