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

      return {
        contents: source.replace(impressReadExpression, JSON.stringify(impressScript)),
        loader: 'ts',
      };
    });
  },
};

const result = await build({
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

if (result.warnings.length > 0) {
  throw new Error(`Plugin bundle completed with ${result.warnings.length} warning(s).`);
}
