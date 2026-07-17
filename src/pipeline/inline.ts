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
  const normalizedReference = normalizeReference(reference);
  if (isAbsolute(normalizedReference)) {
    return normalizedReference;
  }

  return resolve(baseDirectory, normalizedReference);
}

export function inlineMarkdown(markdown: string, baseDirectory = process.cwd()): InlineResult {
  const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  const updatedMarkdown = markdown.replace(imagePattern, (_fullMatch, altText, reference) => {
    const normalizedReference = normalizeReference(reference);

    if (isRemoteReference(normalizedReference)) {
      throw new Error(`Remote asset reference is not allowed: ${normalizedReference}`);
    }

    const resolvedPath = resolveAssetPath(normalizedReference, baseDirectory);
    const assetBytes = readFileSync(resolvedPath);
    const dataUri = `data:${inferMimeType(resolvedPath)};base64,${assetBytes.toString('base64')}`;
    return `![${altText}](${dataUri})`;
  });

  return { markdown: updatedMarkdown };
}
