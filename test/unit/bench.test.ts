import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..', '..');
const fixturePath = path.join(repoRoot, 'fixtures', 'perf', 'big-talk.md');
const benchScript = path.join(repoRoot, 'scripts', 'bench.mjs');
const cliScript = path.join(repoRoot, 'dist', 'cli.js');

test('bench.mjs reports the byte length of built HTML', () => {
  const benchResult = spawnSync(process.execPath, [benchScript, fixturePath, '--theme', 'cards', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(benchResult.status, 0, benchResult.stderr || benchResult.stdout);

  const metrics = JSON.parse(benchResult.stdout);

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'silmaril-bench-'));
  const outputPath = path.join(tempDir, 'big-talk.html');
  try {
    const buildResult = spawnSync(process.execPath, [cliScript, 'build', fixturePath, '--theme', 'cards', '--out', outputPath], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    assert.equal(buildResult.status, 0, buildResult.stderr || buildResult.stdout);

    const buildPayload = JSON.parse(buildResult.stdout);
    assert.equal(buildPayload.ok, true);

    const builtHtml = readFileSync(outputPath, 'utf8');
    assert.equal(
      metrics.outBytes,
      Buffer.byteLength(builtHtml, 'utf8'),
      'scripts/bench.mjs does not measure the real pipeline, so totalMs is null/non-numeric or outBytes reflects source rather than built HTML',
    );
    assert.equal(typeof metrics.totalMs, 'number');
    assert.ok(Number.isFinite(metrics.totalMs));
    assert.ok(metrics.totalMs > 0);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
