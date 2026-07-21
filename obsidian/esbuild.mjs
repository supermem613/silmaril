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
  entryPoints: [path.join(rootDir, 'src', 'main.ts')],
  outfile: path.join(rootDir, 'main.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['node22'],
  external: externals,
  sourcemap: false,
  logLevel: 'info',
});
