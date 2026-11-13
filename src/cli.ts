#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packagePath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const version = (JSON.parse(readFileSync(packagePath, "utf8")) as { version: string }).version;
const program = new Command();

program
  .name("silmaril")
  .description("A deterministic Markdown pipeline for presentations and scrolling documents")
  .version(version);

program
  .command("doctor")
  .description("Verify environment and configuration")
  .option("--json", "Emit machine-readable JSON instead of human output")
  .action(async (opts: { json?: boolean }) => {
    const { doctorCommand } = await import("./commands/doctor.js");
    await doctorCommand(opts);
  });

program
  .command("schema [path...]")
  .description("Emit the machine-readable command catalog")
  .option("--summary", "Return only version, command count, and command paths")
  .action(async (pathArgs: string[] | undefined, opts: { summary?: boolean }) => {
    const { schemaCommand } = await import("./commands/schema.js");
    await schemaCommand(pathArgs ?? [], opts, version);
  });

program
  .command("publish <input>")
  .description("Publish a Markdown presentation or scrolling document as a single HTML file")
  .option("--out <file>", "Write the HTML to a file instead of the system temp directory")
  .option("--open", "Open the generated HTML in the default application")
  .action(async (input: string, opts: { out?: string; open?: boolean }) => {
    const { publishCommand } = await import("./commands/publish.js");
    await publishCommand(input, opts);
  });

program
  .command("serve <input>")
  .description("Serve a Markdown presentation or scrolling document locally with live reload")
  .option("--port <port>", "Port to listen on", String(5173))
  .option("--open", "Open the presentation in the default browser")
  .action(async (input: string, opts: { port?: string; open?: boolean }) => {
    const { serveCommand } = await import("./commands/serve.js");
    const port = opts.port === undefined ? undefined : Number.parseInt(opts.port, 10);
    if (port !== undefined && (!Number.isInteger(port) || port < 0 || port > 65535)) {
      console.error(`Invalid --port value: ${opts.port}`);
      process.exit(1);
    }
    await serveCommand(input, { port, open: opts.open });
  });

program
  .command("update")
  .description("Self-update with git pull, npm install, and rebuild")
  .option("--json", "Emit machine-readable JSON instead of human output")
  .action(async (opts: { json?: boolean }) => {
    const { updateCommand } = await import("./commands/update.js");
    await updateCommand(opts);
  });

if (process.argv.slice(2).length === 0) {
  process.stdout.write(`silmaril v${version}\n\n`);
  program.outputHelp();
  process.exit(0);
}

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
