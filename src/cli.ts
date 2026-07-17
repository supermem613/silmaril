#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Read version from package.json so it stays in sync with the published version.
const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const VERSION = (JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string }).version;

const program = new Command();

program
  .name("silmaril")
  .description("Compile annotated Markdown into a deterministic single-file zoomable-canvas HTML presentation")
  .version(VERSION);

program
  .command("doctor")
  .description("Health check: verify environment and configuration")
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
    await schemaCommand(pathArgs ?? [], opts, VERSION);
  });

program
  .command("build <input>")
  .description("Compile a markdown scene into a deterministic HTML presentation")
  .option("--out <file>", "Write the build output to a file")
  .option("--theme <theme>", "Select the render theme", "cards")
  .option("--emit-scene", "Emit the parsed scene IR as stable JSON")
  .option("--open", "Open the generated HTML in the default application")
  .action(async (input: string, opts: { out?: string; theme?: string; emitScene?: boolean; open?: boolean }) => {
    const { buildCommand } = await import("./commands/build.js");
    await buildCommand(input, opts);
  });

program
  .command("update")
  .description("Self-update: git pull, npm install, and rebuild silmaril")
  .option("--json", "Emit machine-readable JSON instead of human output")
  .action(async (opts: { json?: boolean }) => {
    const { updateCommand } = await import("./commands/update.js");
    await updateCommand(opts);
  });

// Add more commands here, e.g.:
//   import { helloCommand } from "./commands/hello.js";
//   program.command("hello").description("Say hello").action(helloCommand);

// Bare `silmaril` (no args) prints version + full help. Matches the
// rotunda/kash/reflux convention. No version banner before sub-commands
// so machine-parseable output stays clean.
if (process.argv.slice(2).length === 0) {
  process.stdout.write(`silmaril v${VERSION}\n\n`);
  program.outputHelp();
  process.exit(0);
}

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
