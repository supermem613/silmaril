import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = path.dirname(scriptsDir);
const [manifestText, versionsText] = await Promise.all([
  readFile(path.join(pluginDir, 'manifest.json'), 'utf8'),
  readFile(path.join(pluginDir, 'versions.json'), 'utf8'),
]);

const manifest = JSON.parse(manifestText);
const versions = JSON.parse(versionsText);
const semver = /^\d+\.\d+\.\d+$/;

assert.equal(manifest.id, 'silmaril-obsidian');
assert.match(manifest.version, semver);
assert.match(manifest.minAppVersion, semver);
assert.equal(manifest.isDesktopOnly, true);
assert.equal(versions[manifest.version], manifest.minAppVersion);

const releaseTag = process.argv[2];
if (releaseTag !== undefined) {
  assert.equal(releaseTag, `obsidian-v${manifest.version}`);
}
