import { renderPresentationFromMarkdownAsync } from '../../src/pipeline/renderFile.js';
import { dirname, relative } from 'node:path';
import type { FileSystemAdapter, MetadataCache } from 'obsidian';
import mermaid from 'mermaid';

export function createWikiImageResolver(
  metadataCache: Pick<MetadataCache, 'getFirstLinkpathDest'>,
  adapter: Pick<FileSystemAdapter, 'getFullPath'>,
  sourceVaultPath: string,
): (reference: string) => string {
  const directory = dirname(adapter.getFullPath(sourceVaultPath));
  return (reference) => {
    const image = metadataCache.getFirstLinkpathDest(reference, sourceVaultPath);
    if (image === null) {
      throw new Error(`Unable to find image "${reference}" from "${sourceVaultPath}".`);
    }
    return encodeURIComponent(relative(directory, adapter.getFullPath(image.path)));
  };
}

const previewBridgeScript = `
<script>
  (function () {
    var readSlide = function () {
      var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
      var active = document.querySelector('.step.active');
      return {
        slideId: active ? active.getAttribute('data-id') || '' : '',
        slideIndex: active ? steps.indexOf(active) : 0
      };
    };
    var postSlide = function (type) {
      var slide = readSlide();
      window.parent.postMessage({
        type: type,
        slideId: slide.slideId,
        slideIndex: slide.slideIndex
      }, '*');
    };
    var afterPaint = function (callback) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(callback);
      });
    };
    var announceReady = function () {
      afterPaint(function () {
        postSlide('silmaril-preview-ready');
      });
    };

    document.addEventListener('impress:stepenter', function () {
      afterPaint(function () {
        postSlide('silmaril-preview-state');
      });
    });
    window.addEventListener('message', function (event) {
      var data = event.data;
      if (event.source !== window.parent
        || !data
        || data.type !== 'silmaril-preview-restore') {
        return;
      }

      var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
      var target = steps.find(function (step) {
        return step.getAttribute('data-id') === data.slideId;
      });
      if (!target && Number.isInteger(data.slideIndex) && steps.length > 0) {
        var index = Math.max(0, Math.min(data.slideIndex, steps.length - 1));
        target = steps[index];
      }
      if (!target || typeof window.impress !== 'function') {
        announceReady();
        return;
      }
      if (target.classList.contains('active')) {
        announceReady();
        return;
      }

      var targetObserver = new MutationObserver(function () {
        if (!target.classList.contains('active')) {
          return;
        }
        targetObserver.disconnect();
        announceReady();
      });
      targetObserver.observe(target, {
        attributes: true,
        attributeFilter: ['class']
      });
      window.impress().goto(target, 0);
      if (target.classList.contains('active')) {
        targetObserver.disconnect();
        announceReady();
      }
    });

    announceReady();
  })();
</script>`;

function addPreviewBridge(html: string): string {
  const closingBody = '  </body>';
  if (!html.includes(closingBody)) {
    throw new Error('Silmaril presentation is missing its closing body tag.');
  }

  return html.replace(closingBody, `${previewBridgeScript}\n${closingBody}`);
}

export function normalizeMermaidSvg(svg: string): string {
  let normalized = svg.replace(/\sstyle="max-width:[^"]*"/, "");
  const viewBox = normalized.match(/viewBox="([^"]+)"/)?.[1];
  if (viewBox) {
    const values = viewBox.trim().split(/\s+/).map(Number);
    if (values.length >= 4 && values.every(Number.isFinite)) {
      const width = Math.max(1, Math.ceil(values[2]));
      const height = Math.max(1, Math.ceil(values[3]));
      const start = normalized.indexOf("<svg");
      const end = normalized.indexOf(">", start);
      if (start >= 0 && end >= 0) {
        let attrs = normalized
          .slice(start + 4, end)
          .replace(/\s(?:width|height|role|aria-label|preserveAspectRatio)="[^"]*"/g, "");
        attrs = attrs.replace(/\sclass="[^"]*"/g, "");
        normalized = `${normalized.slice(0, start)}<svg${attrs} class="engineering-mermaid" width="${width}" height="${height}" role="img" aria-label="Mermaid diagram" preserveAspectRatio="xMidYMid meet"${normalized.slice(end)}`;
        return normalized;
      }
    }
  }
  if (!normalized.includes("class=\"engineering-mermaid\"")) {
    normalized = normalized.replace(/<svg/, "<svg class=\"engineering-mermaid\"");
  }
  return normalized;
}

async function renderMermaidInObsidian(source: string): Promise<string> {
  if (typeof document === "undefined") {
    const realMermaid = await import("../../src/pipeline/mermaidReal.js");
    const svg = await realMermaid.renderMermaidBlockAsync(source);
    if (!svg) {
      throw new Error("Real Mermaid rendering is unavailable outside the Obsidian browser.");
    }
    return svg;
  }
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    htmlLabels: false,
    flowchart: {
      htmlLabels: false,
      curve: "basis",
      rankSpacing: 80,
      nodeSpacing: 50,
    },
    theme: "base",
    themeVariables: {
      primaryColor: "rgba(103, 211, 194, 0.14)",
      primaryTextColor: "#67D3C2",
      secondaryColor: "rgba(103, 211, 194, 0.14)",
      tertiaryColor: "#14191D",
      lineColor: "#B2BDC3",
      edgeLabelBackground: "#14191D",
      clusterBkg: "#14191D",
      clusterBorder: "#354047",
      fontFamily: "Segoe UI Variable Text, Aptos, Segoe UI, sans-serif",
    },
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const renderId = `silmaril-mermaid-${(hash >>> 0).toString(16)}`;
  const result = await mermaid.render(renderId, source);
  return normalizeMermaidSvg(result.svg);
}

export async function renderStandaloneDeck(
  markdown: string,
  sourcePath: string,
  resolveWikiImage?: (source: string) => string,
) {
  return renderPresentationFromMarkdownAsync(markdown, sourcePath, {
    resolveWikiImage,
    resolveMermaid: renderMermaidInObsidian,
  });
}

export async function renderDeck(
  markdown: string,
  sourcePath: string,
  resolveWikiImage?: (source: string) => string,
) {
  const presentation = await renderStandaloneDeck(markdown, sourcePath, resolveWikiImage);
  return {
    html: addPreviewBridge(presentation.html),
    slideCount: presentation.slideCount,
  };
}
