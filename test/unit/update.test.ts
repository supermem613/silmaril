import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { runSelfUpdate, gitPullMadeNoChanges, isSodaGitInterlockError } from "../../src/commands/update.js";

function sodaStatus(initialized: boolean): string {
  return JSON.stringify({ ok: true, data: { summary: { initialized } } });
}

function sodaPull(worktreeUpdated: boolean): string {
  return JSON.stringify({
    ok: true,
    data: [{ status: worktreeUpdated ? "pulled" : "up-to-date", worktreeUpdated }],
  });
}

describe("update", () => {
  it("skips install and build when pull keeps the same revision", async () => {
    const calls: string[] = [];
    const result = await runSelfUpdate({
      repoRoot: "repo",
      isGitRepo: () => true,
      hasSodaWorkspace: () => false,
      execCommand: async (command, args) => {
        calls.push([command, ...args].join(" "));
        if (command === "sd" && args[0] === "status") {
          return { stdout: sodaStatus(false), stderr: "" };
        }
        if (command === "git" && args.join(" ") === "rev-parse HEAD") {
          return { stdout: "abc123\n", stderr: "" };
        }
        return { stdout: "Already up to date.\n", stderr: "" };
      },
    });
    assert.deepEqual(calls, [
      "git rev-parse HEAD",
      "sd status",
      "git pull --ff-only",
      "git rev-parse HEAD",
    ]);
    assert.equal(result.alreadyUpToDate, true);
    assert.equal(result.installed, false);
    assert.equal(result.built, false);
  });

  it("installs and builds when pull changes the revision", async () => {
    const revisions = ["abc123\n", "def456\n"];
    const calls: string[] = [];
    const result = await runSelfUpdate({
      repoRoot: "repo",
      isGitRepo: () => true,
      hasSodaWorkspace: () => false,
      execCommand: async (command, args) => {
        calls.push([command, ...args].join(" "));
        if (command === "sd" && args[0] === "status") {
          return { stdout: sodaStatus(false), stderr: "" };
        }
        if (command === "git" && args.join(" ") === "rev-parse HEAD") {
          return { stdout: revisions.shift() ?? "def456\n", stderr: "" };
        }
        return { stdout: "Fast-forward\n", stderr: "" };
      },
    });
    assert.deepEqual(calls, [
      "git rev-parse HEAD",
      "sd status",
      "git pull --ff-only",
      "git rev-parse HEAD",
      "npm install --no-audit --no-fund",
      "npm run build",
    ]);
    assert.equal(result.installed, true);
    assert.equal(result.built, true);
  });

  it("uses sd pull when soda markers are present even if status probe fails", async () => {
    const calls: string[] = [];
    const result = await runSelfUpdate({
      repoRoot: "repo",
      isGitRepo: () => true,
      hasSodaWorkspace: () => true,
      execCommand: async (command, args) => {
        calls.push([command, ...args].join(" "));
        if (command === "sd" && args[0] === "status") {
          throw new Error("spawn sd ENOENT");
        }
        if (command === "sd" && args[0] === "pull") {
          return { stdout: sodaPull(false), stderr: "" };
        }
        if (command === "git" && args.join(" ") === "rev-parse HEAD") {
          return { stdout: "abc123\n", stderr: "" };
        }
        return { stdout: "", stderr: "" };
      },
    });
    assert.equal(calls.includes("sd pull"), true);
    assert.equal(calls.includes("git pull --ff-only"), false);
    assert.equal(result.alreadyUpToDate, true);
  });

  it("retries with sd pull after soda interlock blocks git pull", async () => {
    const calls: string[] = [];
    const result = await runSelfUpdate({
      repoRoot: "repo",
      isGitRepo: () => true,
      hasSodaWorkspace: () => false,
      execCommand: async (command, args) => {
        calls.push([command, ...args].join(" "));
        if (command === "sd" && args[0] === "status") {
          return { stdout: sodaStatus(false), stderr: "" };
        }
        if (command === "git" && args.join(" ") === "pull --ff-only") {
          throw new Error("soda: raw git commit blocked in this sd-powered repo");
        }
        if (command === "sd" && args[0] === "pull") {
          return { stdout: sodaPull(false), stderr: "" };
        }
        if (command === "git" && args.join(" ") === "rev-parse HEAD") {
          return { stdout: "abc123\n", stderr: "" };
        }
        return { stdout: "", stderr: "" };
      },
    });
    assert.equal(calls.includes("git pull --ff-only"), true);
    assert.equal(calls.includes("sd pull"), true);
    assert.equal(result.alreadyUpToDate, true);
  });

  it("hard-fails when markers say soda but sd pull cannot run", async () => {
    await assert.rejects(
      () =>
        runSelfUpdate({
          repoRoot: "repo",
          isGitRepo: () => true,
          hasSodaWorkspace: () => true,
          execCommand: async (command, args) => {
            if (command === "sd" && args[0] === "status") {
              throw new Error("spawn sd ENOENT");
            }
            if (command === "sd" && args[0] === "pull") {
              throw new Error("spawn sd ENOENT");
            }
            if (command === "git" && args.join(" ") === "rev-parse HEAD") {
              return { stdout: "abc123\n", stderr: "" };
            }
            return { stdout: "", stderr: "" };
          },
        }),
      /soda-managed.*sd pull failed/i,
    );
  });

  it("fails clearly when install directory is not a git repo", async () => {
    await assert.rejects(
      () => runSelfUpdate({ repoRoot: "not-a-repo", isGitRepo: () => false }),
      /not a git repo/i,
    );
  });

  it("recognizes legacy git no-change output and interlock text", () => {
    assert.equal(gitPullMadeNoChanges("Already up-to-date."), true);
    assert.equal(gitPullMadeNoChanges("Fast-forward"), false);
    assert.equal(isSodaGitInterlockError("soda: raw git commit blocked in this sd-powered repo"), true);
  });
});
