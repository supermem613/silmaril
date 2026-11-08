import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { builtinModules } from 'module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const presentationPath = path.join(rootDir, '..', 'src', 'presentation', 'index.ts');
const impressPath = path.join(rootDir, '..', 'assets', 'vendor', 'impress.min.js');
const impressReadExpression =
  'readFileSync(new URL("../../assets/vendor/impress.min.js", import.meta.url), "utf8")';
const externals = [
  'obsidian',
  'electron',
  'playwright-core',
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
];

const embedImpressScript = {
  name: 'embed-impress-script',
  setup(buildContext) {
    buildContext.onLoad({ filter: /src[\\/]presentation[\\/]index\.ts$/ }, async (args) => {
      const [source, impressScript] = await Promise.all([
        readFile(args.path, 'utf8'),
        readFile(impressPath, 'utf8'),
      ]);

      if (path.resolve(args.path) !== path.resolve(presentationPath)) {
        throw new Error(`Unexpected presentation source: ${args.path}`);
      }
      if (!source.includes(impressReadExpression)) {
        throw new Error('Silmaril presentation asset read expression changed.');
      }
      const encodedImpressScript = Buffer.from(impressScript, 'utf8').toString('base64');

      return {
        contents: source.replace(
          impressReadExpression,
          `Buffer.from(${JSON.stringify(encodedImpressScript)}, "base64").toString("utf8")`,
        ),
        loader: 'ts',
      };
    });
  },
};

const mainResult = await build({
  absWorkingDir: rootDir,
  entryPoints: [path.join(rootDir, 'src', 'main.ts')],
  outfile: path.join(rootDir, 'main.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['es2022'],
  external: externals,
  nodePaths: [path.join(rootDir, 'node_modules')],
  plugins: [embedImpressScript],
  sourcemap: false,
  logLevel: 'info',
});

const adapterResult = await build({
  absWorkingDir: rootDir,
  entryPoints: [path.join(rootDir, 'src', 'renderAdapter.ts')],
  outfile: path.join(rootDir, '.build', 'renderAdapter.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['es2022'],
  external: externals,
  nodePaths: [path.join(rootDir, 'node_modules')],
  plugins: [embedImpressScript],
  sourcemap: false,
  logLevel: 'silent',
});

const warningCount = mainResult.warnings.length + adapterResult.warnings.length;
if (warningCount > 0) {
  throw new Error(`Plugin bundle completed with ${warningCount} warning(s).`);
}
