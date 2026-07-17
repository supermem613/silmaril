import type { CanvasAttrs, SceneAttrs, SceneIR } from "./pipeline/types.js";

export type CommandEffect = "read" | "mutate-local" | "network" | "local";

export type FlagType = "boolean" | "string" | "number";

export interface FlagSpec {
  name: string;
  type: FlagType;
  summary: string;
  default?: boolean | string | number;
  choices?: readonly string[];
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
    schema?: string;
    coverage?: string[];
  };
  examples: string[];
  readmeSummary: string;
  skillReferences: string[];
}

export const emitSceneCapability: FlagSpec = {
  name: "--emit-scene",
  type: "boolean",
  summary: "Emit the parsed scene IR as stable JSON.",
};

export const commandSpecs: CommandSpec[] = [
  {
    path: ["doctor"],
    summary: "Verify environment and configuration.",
    effect: "read",
    input: {
      positionals: [],
      flags: [
        {
          name: "--json",
          type: "boolean",
          summary: "Emit machine-readable JSON instead of human output.",
        },
      ],
    },
    output: {
      documented: true,
      schema: "HealthCheckResult[]",
      coverage: ["stdout", "stderr"],
    },
    examples: ["doctor --json"],
    readmeSummary: "doctor — Verify environment and configuration.",
    skillReferences: ["doctor", "health-check"],
  },
  {
    path: ["schema"],
    summary: "Emit the machine-readable command catalog.",
    effect: "read",
    input: {
      positionals: ["path"],
      flags: [
        {
          name: "--summary",
          type: "boolean",
          summary: "Return only version, command count, and command paths.",
        },
      ],
    },
    output: {
      documented: true,
      schema: "CommandCatalog",
      coverage: ["stdout", "stderr"],
    },
    examples: ["schema", "schema doctor --summary"],
    readmeSummary: "schema — Emit the machine-readable command catalog.",
    skillReferences: ["schema", "catalog"],
  },
  {
    path: ["build"],
    summary: "Compile a markdown scene into a deterministic HTML presentation.",
    effect: "mutate-local",
    input: {
      positionals: ["input"],
      flags: [
        {
          name: "--out",
          type: "string",
          summary: "Write the HTML build output to a file instead of the system temp directory.",
        },
        {
          name: "--theme",
          type: "string",
          summary: "Override the frontmatter render theme.",
          choices: ["cards", "atlas", "sketch"],
        },
        emitSceneCapability,
        {
          name: "--open",
          type: "boolean",
          summary: "Open the generated HTML in the default application.",
        },
      ],
    },
    output: {
      documented: true,
      schema: "BuildResult",
      coverage: ["filesystem", "stdout", "stderr"],
    },
    examples: ["build slides.md", "build slides.md --out slides.html --theme cards", "build slides.md --emit-scene"],
    readmeSummary: "build — Compile a markdown scene into a deterministic HTML presentation.",
    skillReferences: ["build", "render", "assemble"],
  },
  {
    path: ["update"],
    summary: "Self-update this silmaril checkout with git pull, npm install, and rebuild.",
    effect: "mutate-local",
    input: {
      positionals: [],
      flags: [
        {
          name: "--json",
          type: "boolean",
          summary: "Emit machine-readable JSON instead of human output.",
        },
      ],
    },
    output: {
      documented: true,
      schema: "UpdateResult",
      coverage: ["stdout", "stderr", "filesystem"],
    },
    examples: ["update --json"],
    readmeSummary: "update — Self-update this silmaril checkout with git pull, npm install, and rebuild.",
    skillReferences: ["update", "self-update"],
  },
];

function pathMatchesPrefix(path: string[], prefix: string[]): boolean {
  return prefix.every((part, index) => path[index] === part);
}

function sortStableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortStableValue(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortStableValue(entry)]),
    );
  }
  return value;
}

function stableScenePayload(scene: SceneIR): Record<string, unknown> {
  const regions = scene.regions.map((region) => ({
    id: region.id,
    title: region.title,
    attrs: sortStableValue(region.attrs),
    body: region.body,
    groupId: region.groupId,
    children: region.children.map((child) => ({
      id: child.id,
      title: child.title,
      attrs: sortStableValue(child.attrs),
      body: child.body,
      groupId: child.groupId,
      children: [],
    })),
  }));

  return {
    id: scene.id,
    rawMarkdown: scene.rawMarkdown,
    attrs: sortStableValue(scene.attrs as SceneAttrs),
    groupId: scene.groupId,
    theme: scene.theme,
    canvas: scene.canvas ? (sortStableValue(scene.canvas) as CanvasAttrs) : null,
    regions,
  };
}

export function emitSceneJson(scene: SceneIR): string {
  return JSON.stringify(sortStableValue(stableScenePayload(scene)));
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
      {
        name: "--help",
        type: "boolean",
        summary: "Show command help.",
      },
      {
        name: "--version",
        type: "boolean",
        summary: "Show CLI version.",
      },
    ],
    commands: commands.map((command) => ({
      path: command.path,
      summary: command.summary,
      effect: command.effect,
      input: command.input,
      output: command.output,
      examples: command.examples,
      readmeSummary: command.readmeSummary,
      skillReferences: command.skillReferences,
    })),
    errorCodes: [],
    exitCodes: [
      {
        code: 0,
        meaning: "Success.",
      },
      {
        code: 1,
        meaning: "Command failed.",
      },
    ],
  };
}
