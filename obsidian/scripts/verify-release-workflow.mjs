import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.join(
  scriptsDir,
  '..',
  '..',
  '.github',
  'workflows',
  'obsidian-plugin-release.yml',
);
const workflow = await readFile(workflowPath, 'utf8');

assert.match(
  workflow,
  /push:\s*\n\s*tags:\s*\n\s*-\s*["']obsidian-v\*["']/,
);
assert.ok(workflow.includes('npm install --prefix obsidian --no-package-lock'));
assert.ok(
  workflow.includes(
    'node obsidian/scripts/verify-manifest.mjs "${{ github.ref_name }}"',
  ),
);
assert.ok(workflow.includes('npm run build --prefix obsidian'));
assert.ok(workflow.includes('softprops/action-gh-release@v2'));

for (const asset of [
  'obsidian/main.js',
  'obsidian/manifest.json',
  'obsidian/styles.css',
]) {
  assert.ok(workflow.includes(asset), `release workflow is missing ${asset}`);
}

assert.ok(!workflow.includes('npm publish'));
assert.ok(!workflow.includes('obsidian/worker.js'));
