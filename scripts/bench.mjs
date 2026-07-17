#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const parsed = { input: null, theme: 'cards', json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--theme') {
      parsed.theme = argv[index + 1] || 'cards';
      index += 1;
    } else if (arg === '--json') {
      parsed.json = true;
    } else if (!arg.startsWith('-')) {
      if (parsed.input) {
        throw new Error(`Unexpected extra input path: ${arg}`);
      }
      parsed.input = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!parsed.input) {
    throw new Error('Usage: node scripts/bench.mjs <input.md> --theme <theme> --json');
  }
  return parsed;
}

async function loadDistModule() {
  const absolute = path.resolve(scriptDir, '../dist/index.js');
  try {
    return await import(pathToFileURL(absolute).href);
  } catch (error) {
    return null;
  }
}

function requireStage(moduleValue, name) {
  const stage = moduleValue?.[name];
  if (typeof stage !== 'function') {
    throw new Error(`Missing production stage: ${name}`);
  }
  return stage;
}

async function runBench(sourceText, theme, inputPath, distModule) {
  const parseScene = requireStage(distModule, 'parseScene');
  const layoutScene = requireStage(distModule, 'layoutScene');
  const renderRegion = requireStage(distModule, 'renderRegion');
  const inlineMarkdown = requireStage(distModule, 'inlineMarkdown');
  const assemble = requireStage(distModule, 'assemble');
  const getTheme = requireStage(distModule, 'getTheme');
  const validateBuildOutput = requireStage(distModule, 'validateBuildOutput');

  const started = process.hrtime.bigint();
  const scene = parseScene(sourceText);
  const selectedTheme = getTheme(theme);
  const sceneSteps = scene.regions.map((region) => ({
    id: region.id,
    title: region.title,
    groupId: region.groupId,
  }));
  layoutScene(sceneSteps);

  const inputDirectory = path.dirname(inputPath);
  const renderedRegions = scene.regions.map((region) => ({
    id: region.id,
    title: region.title,
    content: renderRegion(inlineMarkdown(region.body, inputDirectory).markdown),
  }));

  const html = assemble(selectedTheme, renderedRegions);
  validateBuildOutput(html);

  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  return {
    totalMs: Number(elapsedMs.toFixed(3)),
    outBytes: Buffer.byteLength(html, 'utf8'),
  };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stdout.write(JSON.stringify({ totalMs: null, outBytes: 0 }));
    return;
  }

  const inputPath = path.isAbsolute(args.input) ? args.input : path.resolve(process.cwd(), args.input);
  const sourceText = await fs.readFile(inputPath, 'utf8');
  const distModule = await loadDistModule();
  const metrics = await runBench(sourceText, args.theme, inputPath, distModule);
  const output = args.json ? JSON.stringify(metrics) : JSON.stringify(metrics, null, 2);
  process.stdout.write(output);
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ totalMs: null, outBytes: 0 }));
});
