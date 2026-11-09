import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

export type MermaidRenderStage =
  | "browser-selection"
  | "browser-launch"
  | "page-create"
  | "page-set-content"
  | "script-load"
  | "mermaid-render"
  | "svg-normalize"
  | "page-close"
  | "browser-close"
  | "success";

export type MermaidBrowserSource = "system" | "playwright" | "none";

export interface MermaidRenderDiagnostic {
  stage: MermaidRenderStage;
  browserSource: MermaidBrowserSource;
  executablePath?: string;
  executableExists?: boolean;
  browserVersion?: string;
  platform: NodeJS.Platform;
  arch: string;
  nodeVersion: string;
  playwrightBrowsersPath: string | undefined;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export type MermaidRenderDiagnosticCallback = (diagnostic: MermaidRenderDiagnostic) => void;

interface BrowserSelection {
  browserSource: Exclude<MermaidBrowserSource, "none">;
  executablePath: string;
}

function findEdgeExecutable(): BrowserSelection | undefined {
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
  const executablePath = candidates.find((candidate) => existsSync(candidate));
  return executablePath
    ? { browserSource: "system", executablePath }
    : undefined;
}

async function findPlaywrightExecutable(): Promise<BrowserSelection | undefined> {
  try {
    const { chromium } = await import("playwright-core");
    const executable = chromium.executablePath();
    if (existsSync(executable)) {
      return { browserSource: "playwright", executablePath: executable };
    }
  } catch {
    // Continue with known browser-cache layouts when the package API cannot resolve a browser.
  }

  const cacheRoots = [
    join(homedir(), "AppData", "Local", "ms-playwright"),
    join(homedir(), ".cache", "ms-playwright"),
    join(homedir(), "Library", "Caches", "ms-playwright"),
    join(process.cwd(), "node_modules", "playwright-core", ".local-browsers"),
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
        return { browserSource: "playwright", executablePath: executable };
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

export async function renderMermaidBlockAsync(
  content: string,
  onDiagnostic?: MermaidRenderDiagnosticCallback,
): Promise<string | undefined> {
  const emit = (diagnostic: MermaidRenderDiagnostic): void => {
    if (!onDiagnostic) {
      return;
    }
    try {
      onDiagnostic(diagnostic);
    } catch {
      // Diagnostics must not alter rendering behavior.
    }
  };
  const baseDiagnostic = () => ({
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    playwrightBrowsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH,
  });
  const selection = await findPlaywrightExecutable() ?? findEdgeExecutable();
  emit({
    stage: "browser-selection",
    browserSource: selection?.browserSource ?? "none",
    executablePath: selection?.executablePath,
    executableExists: selection ? existsSync(selection.executablePath) : false,
    ...baseDiagnostic(),
  });
  if (!selection) {
    return undefined;
  }

  let stage: MermaidRenderStage = "browser-launch";
  let browser: Awaited<ReturnType<typeof import("playwright-core").chromium.launch>> | undefined;
  let page: Awaited<ReturnType<NonNullable<typeof browser>["newPage"]>> | undefined;
  let browserVersion: string | undefined;
  try {
    const { chromium } = await import("playwright-core");
    browser = await chromium.launch({
      headless: true,
      executablePath: selection.executablePath,
    });
    browserVersion = browser.version();
    emit({
      stage: "browser-launch",
      browserSource: selection.browserSource,
      executablePath: selection.executablePath,
      executableExists: existsSync(selection.executablePath),
      browserVersion,
      ...baseDiagnostic(),
    });

    stage = "page-create";
    page = await browser.newPage();
    emit({
      stage,
      browserSource: selection.browserSource,
      executablePath: selection.executablePath,
      executableExists: existsSync(selection.executablePath),
      browserVersion,
      ...baseDiagnostic(),
    });

    stage = "page-set-content";
    await page.setContent("<!doctype html><html><body><div id=\"mermaid-mount\"></div></body></html>");

    stage = "script-load";
    const require = createRequire(import.meta.url);
    const mermaidBundle = require.resolve("mermaid/dist/mermaid.min.js");
    await page.addScriptTag({ path: mermaidBundle });

    stage = "mermaid-render";
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

    stage = "svg-normalize";
    const normalized = normalizeMermaidSvg(svg);

    stage = "page-close";
    await page.close();
    emit({
      stage,
      browserSource: selection.browserSource,
      executablePath: selection.executablePath,
      executableExists: existsSync(selection.executablePath),
      browserVersion,
      ...baseDiagnostic(),
    });

    stage = "browser-close";
    await browser.close();
    emit({
      stage: "success",
      browserSource: selection.browserSource,
      executablePath: selection.executablePath,
      executableExists: existsSync(selection.executablePath),
      browserVersion,
      ...baseDiagnostic(),
    });
    return normalized;
  } catch (error) {
    const caught = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: "UnknownError", message: String(error) };
    emit({
      stage,
      browserSource: selection.browserSource,
      executablePath: selection.executablePath,
      executableExists: existsSync(selection.executablePath),
      browserVersion,
      error: caught,
      ...baseDiagnostic(),
    });
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        const caughtClose = closeError instanceof Error
          ? { name: closeError.name, message: closeError.message, stack: closeError.stack }
          : { name: "UnknownError", message: String(closeError) };
        emit({
          stage: "page-close",
          browserSource: selection.browserSource,
          executablePath: selection.executablePath,
          executableExists: existsSync(selection.executablePath),
          browserVersion,
          error: caughtClose,
          ...baseDiagnostic(),
        });
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        const caughtClose = closeError instanceof Error
          ? { name: closeError.name, message: closeError.message, stack: closeError.stack }
          : { name: "UnknownError", message: String(closeError) };
        emit({
          stage: "browser-close",
          browserSource: selection.browserSource,
          executablePath: selection.executablePath,
          executableExists: existsSync(selection.executablePath),
          browserVersion,
          error: caughtClose,
          ...baseDiagnostic(),
        });
      }
    }
    return undefined;
  }
}
