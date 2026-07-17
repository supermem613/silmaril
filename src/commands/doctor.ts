import { emitJsonFailure, emitJsonSuccess } from "../output.js";

// CheckResult shape is the convention across rotunda/reflux/kash/sp-tools.
// Keep it stable: tooling and `--json` consumers depend on it.
export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  hint?: string;
}

function checkNode(): CheckResult {
  const major = parseInt(process.versions.node.split(".")[0], 10);
  if (major < 22) {
    return {
      name: "node",
      ok: false,
      detail: `Node ${process.versions.node} (need >=22)`,
      hint: "Install Node 22 or later from https://nodejs.org",
    };
  }
  return { name: "node", ok: true, detail: `Node ${process.versions.node}` };
}

async function runChecks(): Promise<CheckResult[]> {
  return [
    checkNode(),
    // Add more checks here. Pattern: each check is a pure function returning
    // CheckResult. Failures should always carry a `hint` with remediation.
  ];
}

export async function doctorCommand(_opts: { json?: boolean }): Promise<void> {
  try {
    const results = await runChecks();
    const allOk = results.every((r) => r.ok);

    emitJsonSuccess("doctor", { ok: allOk, checks: results });
    process.exit(allOk ? 0 : 1);
  } catch (error) {
    const hint = error instanceof Error ? error.message : String(error);
    emitJsonFailure("doctor", "doctor-failed", hint);
    process.exit(1);
  }
}
