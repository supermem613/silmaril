import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const cliPath = join(repoRoot, 'dist', 'cli.js');
const sourcePath = join(repoRoot, 'examples', 'silmaril-tour.md');
const themes = ['cards', 'atlas', 'sketch'] as const;

function readJsonEnvelope(stdout: string) {
  const trimmed = stdout.trim();
  assert.ok(trimmed.length > 0, 'expected build output JSON');
  return JSON.parse(trimmed) as {
    ok: boolean;
    command: string;
    data: {
      outputPath: string;
      byteCount: number;
      theme: string;
      open: null;
    };
    warnings: string[];
  };
}

test('rebuilds example themes into exact golden HTML', () => {
  for (const theme of themes) {
    const tempDir = mkdtempSync(join(tmpdir(), `silmaril-example-${theme}-`));
    const outputPath = join(tempDir, `${theme}.html`);

    try {
      const build = spawnSync(process.execPath, [cliPath, 'build', sourcePath, '--out', outputPath, '--theme', theme], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      assert.equal(build.status, 0, build.stderr || build.stdout);
      assert.equal(build.stderr, '', build.stderr);

      const envelope = readJsonEnvelope(build.stdout);
      assert.equal(envelope.ok, true);
      assert.equal(envelope.command, 'build');
      assert.equal(envelope.data.theme, theme);
      assert.equal(envelope.data.open, null);
      assert.deepEqual(envelope.warnings, []);
      assert.ok(typeof envelope.data.byteCount === 'number' && envelope.data.byteCount > 0);

      const actualBytes = readFileSync(outputPath);
      const committedPath = join(repoRoot, 'examples', `${theme}.html`);
      const committedBytes = readFileSync(committedPath);

      assert.equal(actualBytes.equals(committedBytes), true, `The ${theme} example HTML changed unexpectedly.`);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
});
