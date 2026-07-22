import { build } from 'esbuild';
import { builtinModules } from 'module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const externals = [
  'obsidian',
  'electron',
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
];

await build({
  absWorkingDir: rootDir,
  entryPoints: [path.join(rootDir, 'src', 'renderWorker.ts')],
  outfile: path.join(rootDir, 'worker.js'),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: ['es2022'],
  external: externals,
  nodePaths: [path.join(rootDir, 'node_modules')],
  sourcemap: false,
  logLevel: 'info',
});
