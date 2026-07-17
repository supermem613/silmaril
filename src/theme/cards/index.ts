import type { Theme, ThemeLayoutPlacement, ThemeRegionDescriptor } from '../contract.js';
import { cardsGlobalCss, cardsRegionCss, cardsSceneryCss } from './style.css.js';

interface HtmlNode {
  readonly tag: string;
  readonly tagName: string;
  readonly attrsText: string;
  readonly isVoidElement: boolean;
  readonly selfClosing: boolean;
  readonly text?: string;
  readonly children: HtmlNode[];
}

interface RenderContext {
  firstParagraphApplied: boolean;
  inBlockquote: boolean;
  topLevel: boolean;
  tableCellIndex?: number;
}

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createPlacement(region: ThemeRegionDescriptor, index: number): ThemeLayoutPlacement {
  const column = index % 2;
  const row = Math.floor(index / 2);
  return {
    id: region.id,
    title: region.title,
    x: column * 1400,
    y: row * 900,
    z: 0,
    scale: 1,
    rotate: 0,
  };
}

function decodeBadTextEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseHtml(source: string): readonly HtmlNode[] {
  const root: HtmlNode = {
    tag: 'root',
    tagName: 'root',
    attrsText: '',
    isVoidElement: false,
    selfClosing: false,
    children: [],
  };
  const stack: HtmlNode[] = [root];
  let index = 0;

  while (index < source.length) {
    const tagStart = source.indexOf('<', index);
    if (tagStart === -1) {
      const text = source.slice(index);
      if (text) {
        stack.at(-1)?.children.push(createTextNode(text));
      }
      break;
    }

    if (tagStart > index) {
      stack.at(-1)?.children.push(createTextNode(source.slice(index, tagStart)));
    }

    const tagEnd = source.indexOf('>', tagStart + 1);
    if (tagEnd === -1) {
      stack.at(-1)?.children.push(createTextNode(source.slice(tagStart)));
      break;
    }

    const rawTag = source.slice(tagStart + 1, tagEnd);
    const isClosingTag = rawTag.startsWith('/');
    const content = isClosingTag ? rawTag.slice(1) : rawTag;
    const match = content.match(/^([A-Za-z0-9:-]+)(.*)$/);
    if (!match) {
      index = tagEnd + 1;
      continue;
    }

    const tagName = match[1] ?? '';
    let attrsText = match[2] ?? '';
    const trimmedAttrs = attrsText.replace(/\s+$/, '');
    const selfClosing = trimmedAttrs.endsWith('/');
    if (selfClosing) {
      attrsText = trimmedAttrs.slice(0, -1).replace(/\s+$/, '');
    }

    const tag = tagName.toLowerCase();
    if (isClosingTag) {
      while (stack.length > 1) {
        const current = stack.pop();
        if (current?.tag === tag) {
          break;
        }
      }
      index = tagEnd + 1;
      continue;
    }

    const node: HtmlNode = {
      tag,
      tagName,
      attrsText,
      isVoidElement: VOID_ELEMENTS.has(tag),
      selfClosing,
      children: [],
    };
    stack.at(-1)?.children.push(node);
    if (!node.isVoidElement && !node.selfClosing) {
      stack.push(node);
    }
    index = tagEnd + 1;
  }

  return root.children;
}

function createTextNode(text: string): HtmlNode {
  return {
    tag: '#text',
    tagName: '#text',
    attrsText: '',
    isVoidElement: false,
    selfClosing: false,
    text,
    children: [],
  };
}

function renderElement(node: HtmlNode, content: string): string {
  const openingTag = node.selfClosing
    ? `<${node.tagName}${node.attrsText} />`
    : `<${node.tagName}${node.attrsText}>`;
  return node.isVoidElement || node.selfClosing
    ? openingTag
    : `${openingTag}${content}</${node.tagName}>`;
}

function renderNodes(nodes: readonly HtmlNode[], context: RenderContext): string {
  return nodes.map((node) => renderNode(node, context)).join('');
}

function renderNode(node: HtmlNode, context: RenderContext): string {
  if (node.tag === '#text') {
    return node.text ?? '';
  }

  if (node.tag === 'thead' || node.tag === 'tbody') {
    return renderNodes(node.children, { ...context, topLevel: false });
  }

  if (node.tag === 'p' && context.topLevel && !context.firstParagraphApplied && !context.inBlockquote) {
    context.firstParagraphApplied = true;
    return `<p class="eyebrow">${renderNodes(node.children, { ...context, topLevel: false })}</p>`;
  }

  if (node.tag === 'p' && context.inBlockquote) {
    return `<p class="lede">${renderNodes(node.children, { ...context, topLevel: false })}</p>`;
  }

  if (node.tag === 'blockquote') {
    return renderNodes(node.children, { ...context, inBlockquote: true, topLevel: false });
  }

  if (node.tag === 'h3') {
    return `<span class="tag">${renderNodes(node.children, { ...context, topLevel: false })}</span>`;
  }

  if (node.tag === 'tr') {
    const cells = node.children
      .filter((child) => child.tag === 'td' || child.tag === 'th')
      .map((child, index) => renderNode(child, { ...context, tableCellIndex: index, topLevel: false }))
      .join('');
    return renderElement(node, cells);
  }

  if (node.tag === 'td') {
    const meaningfulChildren = node.children.filter(
      (child) => child.tag !== '#text' || (child.text ?? '').trim().length > 0,
    );
    if (context.tableCellIndex === 1 && meaningfulChildren.length === 1) {
      const child = meaningfulChildren[0];
      if (child?.tag === 'strong') {
        return `<td class="good">${renderNodes(child.children, { ...context, topLevel: false })}</td>`;
      }
      if (child?.tag === 's') {
        return `<td class="bad">${renderNodes(child.children, { ...context, topLevel: false })}</td>`;
      }
      if (child?.tag === 'em') {
        return `<td class="warn">${renderNodes(child.children, { ...context, topLevel: false })}</td>`;
      }
    }
  }

  if (node.tag === 's') {
    return `<span class="bad">${decodeBadTextEntities(renderNodes(node.children, { ...context, topLevel: false }))}</span>`;
  }

  if (node.tag === 'em' && node.children.length === 1 && node.children[0]?.tag === 'strong') {
    const strong = node.children[0];
    const meaningfulChildren = strong.children.filter(
      (child) => child.tag !== '#text' || (child.text ?? '').trim().length > 0,
    );
    if (meaningfulChildren.length === 1 && meaningfulChildren[0]?.tag === 'code') {
      return `<kbd>${renderNodes(meaningfulChildren[0].children, { ...context, topLevel: false })}</kbd>`;
    }
    return `<span class="good">${renderNodes(strong.children, { ...context, topLevel: false })}</span>`;
  }

  return renderElement(node, renderNodes(node.children, { ...context, topLevel: false }));
}

function renderSemanticRegion(content: string): string {
  return renderNodes(parseHtml(content), {
    firstParagraphApplied: false,
    inBlockquote: false,
    topLevel: true,
  });
}

function renderPlainRegion(region: ThemeRegionDescriptor): string {
  return `<h2>${escapeHtml(region.title)}</h2>${region.content}`;
}

export function cardsTheme(): Theme {
  return {
    name: 'cards',
    title: 'Zoomable Canvas — Spike',
    backgroundColor: '#0a0f1a',
    accentColor: '#5ec8ff',
    bodyClass: 'impress-not-supported',
    viewport: 'width=1024, minimum-scale=1, maximum-scale=1, user-scalable=no',
    fallbackHtml: '<div class="fallback-message"><p><strong>Your browser doesn\'t support CSS 3D transforms.</strong></p><p>Open <code>talk.html</code> in a recent Edge, Chrome, or Firefox.</p></div>',
    hintHtml: '<div class="hint"><kbd>Space</kbd>/<kbd>→</kbd> next · <kbd>←</kbd> back · <kbd>Tab</kbd> overview · <kbd>H</kbd> help · <kbd>F</kbd> fullscreen</div>',
    impressAttributes: {
      'transition-duration': 900,
    },
    globalCss: cardsGlobalCss,
    sceneryCss: cardsSceneryCss,
    regionCss: cardsRegionCss,
    wrapRegion: false,
    overview: {
      x: 850,
      y: 150,
      scale: 7,
      content: '<h1>The whole map</h1><p class="lede">Press <kbd>Space</kbd> to start · this is the zoom-out anchor</p>',
    },
    layout(regions) {
      return regions.map((region, index) => createPlacement(region, index));
    },
    renderRegion(region) {
      return /<h[12](?:\s[^>]*)?>/i.test(region.content)
        ? renderSemanticRegion(region.content)
        : renderPlainRegion(region);
    },
  };
}
