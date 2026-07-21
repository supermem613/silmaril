import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const readme = await readFile(path.join(scriptsDir, '..', 'README.md'), 'utf8');
const required = [
  'Install with BRAT',
  'Manual install',
  'install-plugin.ps1',
  'main.js',
  'manifest.json',
  'styles.css',
  'allow-scripts',
  'allow-same-origin',
  'trusted, self-generated deck',
  'file://',
  'dedicated repository',
  'MIT LICENSE',
];

for (const marker of required) {
  assert.ok(readme.includes(marker), `README.md is missing ${marker}`);
}
