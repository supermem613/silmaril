import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

function findEdgeExecutable(): string | undefined {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

async function findPlaywrightExecutable(): Promise<string | undefined> {
  try {
    const { chromium } = await import("playwright-core");
    const executable = chromium.executablePath();
    if (existsSync(executable)) {
      return executable;
    }
  } catch {
    // Continue with known browser-cache layouts when the package API cannot resolve a browser.
  }

  const cacheRoots = [
    join(homedir(), "AppData", "Local", "ms-playwright"),
    join(homedir(), ".cache", "ms-playwright"),
    join(homedir(), "Library", "Caches", "ms-playwright"),
  ];
  for (const cacheRoot of cacheRoots) {
    if (!existsSync(cacheRoot)) {
      continue;
    }
    const revisions = readdirSync(cacheRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && (
        entry.name.startsWith("chromium-")
        || entry.name.startsWith("chromium_headless_shell-")
      ))
      .sort((left, right) => right.name.localeCompare(left.name));
    for (const revision of revisions) {
      const candidates = [
        join(cacheRoot, revision.name, "chrome-win64", "chrome.exe"),
        join(cacheRoot, revision.name, "chrome-win", "chrome.exe"),
        join(cacheRoot, revision.name, "chrome-linux", "chrome"),
        join(cacheRoot, revision.name, "chrome-linux64", "chrome"),
        join(cacheRoot, revision.name, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        join(cacheRoot, revision.name, "chrome-headless-shell-win64", "chrome-headless-shell.exe"),
        join(cacheRoot, revision.name, "chrome-headless-shell-linux64", "chrome-headless-shell"),
      ];
      const executable = candidates.find((candidate) => existsSync(candidate));
      if (executable) {
        return executable;
      }
    }
  }
  return undefined;
}

function normalizeMermaidSvg(svg: string): string {
  let normalized = svg.replace(/\sstyle="max-width:\s*[^"]*"/, "");
  const viewBox = normalized.match(/viewBox="([^"]+)"/)?.[1];
  if (viewBox) {
    const values = viewBox.trim().split(/\s+/).map(Number);
    if (values.length >= 4 && values.every(Number.isFinite)) {
      const width = Math.max(1, Math.ceil(values[2]));
      const height = Math.max(1, Math.ceil(values[3]));
      const start = normalized.indexOf("<svg");
      const end = normalized.indexOf(">", start);
      if (start >= 0 && end >= 0) {
        let attrs = normalized.slice(start + 4, end)
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
  normalized = normalized.replace(/\sstyle="max-width:\s*[^"]*"/, "");
  return normalized;
}

export async function renderMermaidBlockAsync(content: string): Promise<string | undefined> {
  const executablePath = findEdgeExecutable() ?? await findPlaywrightExecutable();
  if (!executablePath) {
    return undefined;
  }

  try {
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage();
    try {
      await page.setContent("<!doctype html><html><body><div id=\"mermaid-mount\"></div></body></html>");
      const require = createRequire(import.meta.url);
      const mermaidBundle = require.resolve("mermaid/dist/mermaid.min.js");
      await page.addScriptTag({ path: mermaidBundle });
      const renderId = `silmaril-mermaid-${createHash("sha256").update(content).digest("hex").slice(0, 12)}`;
      const svg = await page.evaluate(async ({ source, renderId }: { source: string; renderId: string }) => {
        const mermaid = (globalThis as unknown as {
          mermaid: {
            initialize(options: Record<string, unknown>): void;
            render(id: string, text: string): Promise<{ svg: string }>;
          };
        }).mermaid;
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
        const result = await mermaid.render(renderId, source);
        return result.svg;
      }, { source: content, renderId });
      return normalizeMermaidSvg(svg);
    } finally {
      await page.close();
      await browser.close();
    }
  } catch {
    return undefined;
  }
}
