import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = path.dirname(scriptsDir);
const repoRoot = path.dirname(pluginDir);

const readRepo = (relativePath) =>
  readFile(path.join(repoRoot, relativePath), 'utf8');

async function versionSurface() {
  const [indexText, cliText] = await Promise.all([
    readRepo('src/index.ts'),
    readRepo('src/cli.ts'),
  ]);
  const exports = [...indexText.matchAll(/export\s+\{\s*(\w+)\s*\}/g)]
    .map((match) => match[1])
    .sort();

  assert.deepEqual(exports, [
    'buildPresentation',
    'inlineMarkdown',
    'parseBoard',
    'render',
    'renderAsync',
    'renderMarkdown',
    'validateBuildOutput',
  ]);
  assert.ok(cliText.includes('.command("publish <input>")'));
}

async function noRejectedApproaches() {
  const [adapter, pluginSource, registry, indexText, cliText] = await Promise.all([
    readRepo('obsidian/src/renderAdapter.ts'),
    Promise.all([
      'obsidian/src/main.ts',
      'obsidian/src/deckView.ts',
      'obsidian/src/renderScheduler.ts',
      'obsidian/src/renderWorker.ts',
    ]).then(async (files) => (await Promise.all(files.map(readRepo))).join('\n')),
    readRepo('src/registry.ts'),
    readRepo('src/index.ts'),
    readRepo('src/cli.ts'),
  ]);

  assert.ok(
    adapter.includes(
      "import { renderPresentationFromMarkdownAsync } from '../../src/pipeline/renderFile.js';",
    ),
  );
  assert.ok(adapter.includes('resolveMermaid: renderMermaidInObsidian'));
  assert.ok(adapter.includes("import mermaid from 'mermaid';"));
  assert.ok(adapter.includes('mermaid.initialize'));
  assert.ok(adapter.includes('mermaid.render'));

  const rejected = [
    /serveCommand/,
    /child_process/,
    /silmaril\s+serve/i,
    /from\s+['"]markdown-it['"]/i,
    /from\s+['"]highlight\.js['"]/i,
  ];
  for (const pattern of rejected) {
    assert.ok(!pattern.test(pluginSource), `rejected approach matched ${pattern}`);
  }

  assert.ok(registry.includes('function buildReadmeSummary'));
  assert.ok(registry.includes('export function buildSchema'));
  assert.ok(indexText.includes('export { buildPresentation }'));
  assert.ok(cliText.includes('.command("publish <input>")'));
}

async function securityDecision() {
  const [view, readme] = await Promise.all([
    readRepo('obsidian/src/deckView.ts'),
    readRepo('obsidian/README.md'),
  ]);

  for (const text of [view, readme]) {
    assert.ok(/allow-scripts[\s\S]{0,80}allow-same-origin/.test(text));
    assert.ok(/trusted.*self-generated/i.test(text));
  }
  assert.ok(view.includes('getResourcePath'));
  assert.ok(!view.includes('pathToFileURL'));
  assert.ok(readme.includes('Obsidian resource URL'));
  assert.ok(readme.includes('file://'));
}

async function collectProductFiles() {
  const files = [];
  const queue = [pluginDir];
  const excludedDirectories = new Set(['scripts', 'node_modules', '.build']);
  const excludedFiles = new Set(['main.js', 'worker.js']);
  const textExtensions = new Set([
    '.css',
    '.json',
    '.md',
    '.mjs',
    '.ps1',
    '.ts',
    '.yml',
  ]);

  while (queue.length > 0) {
    const directory = queue.shift();
    if (directory === undefined) {
      break;
    }

    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(entry.name)) {
          queue.push(entryPath);
        }
      } else if (
        !excludedFiles.has(entry.name) &&
        textExtensions.has(path.extname(entry.name))
      ) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

async function noOrchestrationVocab() {
  const banned = [
    /\bpor\b/i,
    /\bswarm\b/i,
    /\borchestrator\b/i,
    /\bexecutor\b/i,
    /\bidempotency key\b/i,
    /\bauthority grant\b/i,
    /\bdirect mode\b/i,
    /\bdelegated mode\b/i,
    /\bred witness\b/i,
    /\bprepared plan\b/i,
    /\bsidequest\b/i,
    /\breadiness gate\b/i,
    /\bphase\b/i,
    /\btask id\b/i,
    /\bTDD\b/,
    /\bRED\b/,
    /\bGREEN\b/,
    /\/prepare\b/,
    /\/implement\b/,
    /\/release\b/,
  ];

  for (const filePath of await collectProductFiles()) {
    const text = await readFile(filePath, 'utf8');
    for (const pattern of banned) {
      assert.ok(
        !pattern.test(text),
        `${path.relative(repoRoot, filePath)} contains ${pattern}`,
      );
    }
  }
}

async function communityArtifacts() {
  const [manifestText, versionsText, workflow, readme] = await Promise.all([
    readRepo('obsidian/manifest.json'),
    readRepo('obsidian/versions.json'),
    readRepo('.github/workflows/obsidian-plugin-release.yml'),
    readRepo('obsidian/README.md'),
  ]);
  const manifest = JSON.parse(manifestText);
  const versions = JSON.parse(versionsText);

  assert.equal(manifest.id, 'silmaril-obsidian');
  assert.equal(manifest.isDesktopOnly, true);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
  assert.ok(workflow.includes('obsidian-v*'));
  assert.ok(workflow.includes('verify-manifest.mjs "${{ github.ref_name }}"'));
  assert.ok(workflow.includes('obsidian/main.js'));
  assert.ok(workflow.includes('obsidian/manifest.json'));
  assert.ok(workflow.includes('obsidian/styles.css'));
  assert.ok(readme.includes('Install with BRAT'));
  assert.ok(readme.includes('Manual install'));
  assert.ok(readme.includes('install-plugin.ps1'));
  assert.ok(readme.includes('dedicated repository'));
  await access(path.join(repoRoot, 'LICENSE'));
  await access(path.join(pluginDir, 'install-plugin.ps1'));
}

const checks = new Map([
  ['version-surface', versionSurface],
  ['no-rejected-approaches', noRejectedApproaches],
  ['security-decision', securityDecision],
  ['no-orchestration-vocab', noOrchestrationVocab],
  ['community-artifacts', communityArtifacts],
]);

const checkName = process.argv[2];
if (checkName === 'all') {
  for (const check of checks.values()) {
    await check();
  }
} else {
  const check = checks.get(checkName);
  if (check === undefined) {
    console.error(`Unknown check. Use ${[...checks.keys(), 'all'].join(', ')}.`);
    process.exit(1);
  }
  await check();
}
