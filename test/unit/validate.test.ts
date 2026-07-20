import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

type ValidationEnvelope = {
  ok: boolean;
  code: number;
  diagnostic: string;
  message: string;
  input: string;
  profile: string;
};

function runValidator(fixturePath: string, extraArgs: string[] = []) {
  const scriptPath = fileURLToPath(new URL("../../scripts/validate.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs, fixturePath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let payload: ValidationEnvelope;
  try {
    payload = JSON.parse(result.stdout.trim()) as ValidationEnvelope;
  } catch {
    assert.fail(`validator did not emit JSON for ${fixturePath}: ${result.stdout || result.stderr}`);
  }

  return { status: result.status ?? 0, payload };
}

describe("canvas validator", () => {
  it("validates the canvas profile and exit contract", () => {
    const goldenPath = fileURLToPath(new URL("../fixtures/validate/good.html", import.meta.url));
    const golden = runValidator(goldenPath, ["--profile", "canvas", "--json"]);
    assert.equal(golden.status, 0, `expected golden fixture to pass, received ${golden.payload.diagnostic} (${golden.payload.code})`);
    assert.equal(golden.payload.code, 0, `expected golden fixture to return code 0, received ${golden.payload.code}`);
    assert.equal(golden.payload.diagnostic, "SILMARIL_OK", `expected golden fixture diagnostic, received ${golden.payload.diagnostic}`);
    assert.equal(golden.payload.profile, "canvas", `expected profile to be preserved, received ${golden.payload.profile}`);

    const remotePath = fileURLToPath(new URL("../fixtures/validate/remote.html", import.meta.url));
    const remote = runValidator(remotePath, ["--profile", "canvas", "--json"]);
    assert.equal(remote.status, 1, `expected remote fixture to fail with exit 1, received ${remote.status}`);
    assert.equal(remote.payload.code, 1, `expected remote fixture to return code 1, received ${remote.payload.code}`);
    assert.equal(remote.payload.diagnostic, "SILMARIL_CANVAS_PROFILE_VALIDATION_FAILED", `expected remote fixture diagnostic, received ${remote.payload.diagnostic}`);

    const nostepPath = fileURLToPath(new URL("../fixtures/validate/nostep.html", import.meta.url));
    const nostep = runValidator(nostepPath, ["--profile", "canvas", "--json"]);
    assert.equal(nostep.status, 1, `expected no-step fixture to fail with exit 1, received ${nostep.status}`);
    assert.equal(nostep.payload.code, 1, `expected no-step fixture to return code 1, received ${nostep.payload.code}`);
    assert.equal(nostep.payload.diagnostic, "SILMARIL_CANVAS_PROFILE_VALIDATION_FAILED", `expected no-step fixture diagnostic, received ${nostep.payload.diagnostic}`);

    const unknownProfile = runValidator(goldenPath, ["--profile", "unknown", "--json"]);
    assert.equal(unknownProfile.status, 2, `expected unknown profile to fail with exit 2, received ${unknownProfile.status}`);
    assert.equal(unknownProfile.payload.code, 2, `expected unknown profile to return code 2, received ${unknownProfile.payload.code}`);
    assert.equal(unknownProfile.payload.diagnostic, "SILMARIL_INVALID_ARGUMENT", `expected unknown profile diagnostic, received ${unknownProfile.payload.diagnostic}`);
  });
});
