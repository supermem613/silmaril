import { spawn } from "node:child_process";
import { createServer, type Server, type ServerResponse } from "node:http";
import { readFileSync, unwatchFile, watchFile } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emitJsonFailure, emitJsonSuccess } from "../output.js";
import { renderPresentationFromMarkdownAsync } from "../pipeline/renderFile.js";

export type ServeOptions = {
  port?: number;
  open?: boolean;
};

export type OpenUrl = (url: string) => void;

export interface ServeDependencies {
  openUrl?: OpenUrl;
}

const DEFAULT_PORT = 5173;

const PACKAGE_MANIFEST = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json"), "utf8"),
) as {
  version: string;
  repository?: { url?: string };
};
const PACKAGE_VERSION = PACKAGE_MANIFEST.version;
const PACKAGE_REPOSITORY_URL = PACKAGE_MANIFEST.repository?.url;

export interface ServeServerOptions {
  readonly version?: string;
  readonly repositoryUrl?: string;
  readonly watchInterval?: number;
}

export interface ServeServerHandle {
  readonly server: Server;
  close(): Promise<void>;
}

function launchDefaultBrowser(url: string): void {
  const command = process.platform === "win32"
    ? "explorer.exe"
    : process.platform === "darwin"
      ? "open"
      : "xdg-open";
  const child = spawn(command, [url], { detached: true, stdio: "ignore" });
  child.once("error", (error) => {
    process.stderr.write(`Unable to open ${url}: ${error.message}\n`);
  });
  child.unref();
}

/**
 * Builds the live-reload HTTP server without binding a port so tests can listen on an
 * ephemeral port. The caller owns `listen`.
 */
export function createServeServer(input: string, options: ServeServerOptions = {}): ServeServerHandle {
  const inputPath = isAbsolute(input) ? input : resolve(process.cwd(), input);
  const watchInterval = options.watchInterval ?? 250;

  // Mirror of the on-disk source so the file watcher only broadcasts a reload when the
  // source actually changes.
  let lastKnownContent = readFileSync(inputPath, "utf8");

  const liveReloadClients = new Set<ServerResponse>();

  const broadcastReload = (): void => {
    for (const client of liveReloadClients) {
      client.write("data: reload\n\n");
    }
  };

  const watchListener = (): void => {
    let current: string;
    try {
      current = readFileSync(inputPath, "utf8");
    } catch {
      return;
    }
    if (current !== lastKnownContent) {
      lastKnownContent = current;
      broadcastReload();
    }
  };
  watchFile(inputPath, { interval: watchInterval }, watchListener);

  const renderPage = async (): Promise<string> => {
    const { html } = await renderPresentationFromMarkdownAsync(lastKnownContent, inputPath, {
      version: options.version,
      repositoryUrl: options.repositoryUrl,
      liveReload: true,
    });
    return html;
  };

  const server = createServer(async (request, response) => {
    const method = request.method ?? "GET";
    const url = request.url ?? "/";

    if (method === "GET" && (url === "/" || url.startsWith("/?"))) {
      let html: string;
      try {
        html = await renderPage();
      } catch (error) {
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(error instanceof Error ? error.message : String(error));
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
      return;
    }

    if (method === "GET" && url === "/__silmaril/livereload") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      response.write("retry: 1000\n\n");
      liveReloadClients.add(response);
      request.on("close", () => {
        liveReloadClients.delete(response);
      });
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });

  const close = async (): Promise<void> => {
    unwatchFile(inputPath, watchListener);
    for (const client of liveReloadClients) {
      client.end();
    }
    liveReloadClients.clear();
    await new Promise<void>((resolveClose) => {
      server.close(() => resolveClose());
    });
  };

  return { server, close };
}

export async function serveCommand(input: string, opts: ServeOptions, deps: ServeDependencies = {}): Promise<void> {
  const port = opts.port ?? DEFAULT_PORT;
  const host = "127.0.0.1";

  let handle: ServeServerHandle;
  try {
    handle = createServeServer(input, {
      version: PACKAGE_VERSION,
      repositoryUrl: PACKAGE_REPOSITORY_URL,
    });
  } catch (error) {
    emitJsonFailure("serve", "serve-failed", error instanceof Error ? error.message : String(error));
    process.exit(1);
    return;
  }

  handle.server.on("error", (error: NodeJS.ErrnoException) => {
    const hint = error.code === "EADDRINUSE"
      ? `Port ${port} is already in use. Choose another with --port.`
      : error.message;
    emitJsonFailure("serve", "serve-failed", hint);
    process.exit(1);
  });

  handle.server.listen(port, host, () => {
    const url = `http://${host}:${port}/`;
    const open = opts.open
      ? (() => {
        (deps.openUrl ?? launchDefaultBrowser)(url);
        return { requested: true, launched: true, target: url };
      })()
      : null;

    emitJsonSuccess("serve", {
      url,
      host,
      port,
      input: isAbsolute(input) ? input : resolve(process.cwd(), input),
      open,
    });
  });
}
