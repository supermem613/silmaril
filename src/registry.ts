export type CommandEffect = "read" | "mutate-local";
export type FlagType = "boolean" | "string";

export interface FlagSpec {
  name: string;
  type: FlagType;
  summary: string;
}

export interface CommandSpec {
  path: string[];
  summary: string;
  effect: CommandEffect;
  input: {
    positionals: string[];
    flags: FlagSpec[];
  };
  output: {
    documented: boolean;
    schema: string;
    coverage: string[];
  };
  examples: string[];
  readmeSummary: string;
  skillReferences: string[];
}

export const commandSpecs: CommandSpec[] = [
  {
    path: ["doctor"],
    summary: "Verify environment and configuration.",
    effect: "read",
    input: {
      positionals: [],
      flags: [{ name: "--json", type: "boolean", summary: "Emit machine-readable JSON instead of human output." }],
    },
    output: { documented: true, schema: "HealthCheckResult[]", coverage: ["stdout", "stderr"] },
    examples: ["doctor --json"],
    readmeSummary: "doctor - Verify environment and configuration.",
    skillReferences: ["doctor", "health-check"],
  },
  {
    path: ["schema"],
    summary: "Emit the machine-readable command catalog.",
    effect: "read",
    input: {
      positionals: ["path"],
      flags: [{ name: "--summary", type: "boolean", summary: "Return only version, command count, and command paths." }],
    },
    output: { documented: true, schema: "CommandCatalog", coverage: ["stdout", "stderr"] },
    examples: ["schema", "schema doctor --summary"],
    readmeSummary: "schema - Emit the machine-readable command catalog.",
    skillReferences: ["schema", "catalog"],
  },
  {
    path: ["publish"],
    summary: "Publish a Markdown presentation as a single HTML file.",
    effect: "mutate-local",
    input: {
      positionals: ["input"],
      flags: [
        { name: "--out", type: "string", summary: "Write the HTML to a file instead of the system temp directory." },
        { name: "--open", type: "boolean", summary: "Open the generated HTML in the default application." },
      ],
    },
    output: { documented: true, schema: "PublishResult", coverage: ["filesystem", "stdout", "stderr"] },
    examples: ["publish slides.md", "publish slides.md --out slides.html", "publish slides.md --open"],
    readmeSummary: "publish - Publish a Markdown presentation as a single HTML file.",
    skillReferences: ["publish", "presentation"],
  },
  {
    path: ["serve"],
    summary: "Serve a Markdown presentation locally with live reload.",
    effect: "read",
    input: {
      positionals: ["input"],
      flags: [
        { name: "--port", type: "string", summary: "Port to listen on. Defaults to 5173." },
        { name: "--open", type: "boolean", summary: "Open the presentation in the default browser." },
      ],
    },
    output: { documented: true, schema: "ServeResult", coverage: ["network", "stdout", "stderr"] },
    examples: ["serve slides.md", "serve slides.md --port 4000", "serve slides.md --open"],
    readmeSummary: "serve - Serve a Markdown presentation locally with live reload.",
    skillReferences: ["serve", "live-reload"],
  },
  {
    path: ["update"],
    summary: "Self-update this silmaril checkout with git pull, npm install, and rebuild.",
    effect: "mutate-local",
    input: {
      positionals: [],
      flags: [{ name: "--json", type: "boolean", summary: "Emit machine-readable JSON instead of human output." }],
    },
    output: { documented: true, schema: "UpdateResult", coverage: ["stdout", "stderr", "filesystem"] },
    examples: ["update --json"],
    readmeSummary: "update - Self-update this silmaril checkout with git pull, npm install, and rebuild.",
    skillReferences: ["update", "self-update"],
  },
];

function pathMatchesPrefix(path: string[], prefix: string[]): boolean {
  return prefix.every((part, index) => path[index] === part);
}

export function buildReadmeSummary(): string[] {
  return commandSpecs.map((command) => command.readmeSummary);
}

export function buildSchema(cliVersion: string, pathPrefix: string[] = [], summary = false) {
  const commands = commandSpecs.filter((command) => pathMatchesPrefix(command.path, pathPrefix));
  if (summary) {
    return {
      schemaVersion: 1,
      cliVersion,
      commandCount: commands.length,
      commandPaths: commands.map((command) => command.path),
    };
  }

  return {
    schemaVersion: 1,
    cliVersion,
    envelope: {
      stdout: "JSON only for non-interactive commands when --json or schema is used",
      stderr: "progress, diagnostics, and human narration",
      successEnvelope: ["ok", "command", "data", "warnings"],
      errorEnvelope: ["ok", "command", "error", "hint"],
    },
    globalFlags: [
      { name: "--help", type: "boolean", summary: "Show command help." },
      { name: "--version", type: "boolean", summary: "Show CLI version." },
    ],
    commands,
    errorCodes: [],
    exitCodes: [
      { code: 0, meaning: "Success." },
      { code: 1, meaning: "Command failed." },
    ],
  };
}
