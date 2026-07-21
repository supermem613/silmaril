import { createHash } from "node:crypto";
import { buildPresentation } from "../presentation/index.js";

export interface DeterminismAuditResult {
  readonly ok: boolean;
  readonly sha256: string;
  readonly repeatedSha256: string;
  readonly consistent: boolean;
  readonly outputLength: number;
  readonly bannedPatternMatches: readonly string[];
}

const AUDIT_PATTERNS: ReadonlyArray<{ readonly name: string; readonly pattern: RegExp }> = [
  { name: "timestamp", pattern: /\d{4}-\d{2}-\d{2}(?:[T ][0-9:.]+)?/ },
  { name: "math-random", pattern: /Math\.random/ },
  { name: "random-id", pattern: /\b(?:id|data-id)=["'][0-9a-f]{8,}["']/i },
];

function hashOutput(output: string): string {
  return createHash("sha256").update(output, "utf8").digest("hex");
}

export function auditDeterminism(): DeterminismAuditResult {
  const slides = [
    { id: "overview", title: "Overview", content: "<p>A concise opening.</p>" },
    { id: "detail", title: "Detail", content: "<p>A compact detail.</p>" },
    { id: "finish", title: "Finish", content: "<p>A closing summary.</p>" },
  ];
  const firstOutput = buildPresentation(slides, { documentTitle: "Determinism audit" });
  const secondOutput = buildPresentation(slides, { documentTitle: "Determinism audit" });
  const sha256 = hashOutput(firstOutput);
  const repeatedSha256 = hashOutput(secondOutput);
  const bannedPatternMatches = AUDIT_PATTERNS
    .filter(({ pattern }) => pattern.test(`${firstOutput}\n${secondOutput}`))
    .map(({ name }) => name);
  const consistent = sha256 === repeatedSha256 && bannedPatternMatches.length === 0;

  return {
    ok: consistent,
    sha256,
    repeatedSha256,
    consistent,
    outputLength: firstOutput.length,
    bannedPatternMatches,
  };
}
