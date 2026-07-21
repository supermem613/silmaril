import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = path.dirname(scriptsDir);

await import(pathToFileURL(path.join(pluginDir, 'esbuild.mjs')).href);

const bundlePath = path.join(pluginDir, 'main.js');
const bundle = await readFile(bundlePath, 'utf8');

assert.ok(bundle.length > 0, 'main.js must be non-empty');
assert.match(
  bundle,
  /default:\s*\(\)\s*=>\s*SilmarilPlugin/,
  'main.js must export SilmarilPlugin as its default export',
);
assert.match(
  bundle,
  /SilmarilPlugin\s*=\s*class extends .*\.Plugin/,
  'SilmarilPlugin must extend the Obsidian Plugin class',
);

const requiredMarkers = [
  'registerView',
  'addCommand',
  'addRibbonIcon',
  'onload',
  'onunload',
  'allow-scripts allow-same-origin',
  'base64',
  'getResourcePath',
];

for (const marker of requiredMarkers) {
  assert.ok(bundle.includes(marker), `main.js is missing ${marker}`);
}

for (const marker of ['createObjectURL', 'revokeObjectURL', 'pathToFileURL']) {
  assert.ok(!bundle.includes(marker), `main.js must not retain ${marker}`);
}

assert.ok(!bundle.includes('import.meta.url'), 'main.js must not retain import.meta.url');
assert.ok(
  !bundle.includes('assets/vendor/impress.min.js'),
  'main.js must embed the Impress runtime instead of reading it from disk',
);
