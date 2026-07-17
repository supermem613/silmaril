#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const stageNames = ['parse', 'layout', 'render', 'assemble'];

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

function resolveStage(moduleValue, names) {
  const candidates = [];
  if (moduleValue && typeof moduleValue === 'object') {
    for (const name of names) {
      if (moduleValue[name] && typeof moduleValue[name] === 'function') {
        candidates.push(moduleValue[name]);
      }
    }
    if (moduleValue.default && typeof moduleValue.default === 'object') {
      for (const name of names) {
        if (moduleValue.default[name] && typeof moduleValue.default[name] === 'function') {
          candidates.push(moduleValue.default[name]);
          break;
        }
      }
    }
  }
  return candidates[0] || null;
}

function normalizeStage(stage) {
  if (!stage) {
    return null;
  }
  if (typeof stage === 'function') {
    return stage;
  }
  if (stage && typeof stage === 'object') {
    if (typeof stage.run === 'function') {
      return stage.run.bind(stage);
    }
    if (typeof stage.execute === 'function') {
      return stage.execute.bind(stage);
    }
  }
  return null;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

async function loadDistModule() {
  const candidates = [
    '../dist/index.js',
    '../dist/index.mjs',
    '../dist/index.cjs',
    '../dist/index',
  ];
  for (const candidate of candidates) {
    const absolute = path.resolve(scriptDir, candidate);
    try {
      return await import(pathToFileURL(absolute).href);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'ERR_MODULE_NOT_FOUND' && error.code !== 'MODULE_NOT_FOUND') {
        return {};
      }
    }
  }
  return {};
}

async function runBench(sourceText, theme, distModule) {
  const stages = stageNames.map((name) => normalizeStage(resolveStage(distModule, [name])));
  const iterations = [];
  for (let run = 0; run < 5; run += 1) {
    let payload = sourceText;
    const timings = [];
    const stageResults = [];
    for (let index = 0; index < stages.length; index += 1) {
      const stage = stages[index];
      const started = process.hrtime.bigint();
      if (stage) {
        try {
          const maybePromise = stage(payload, { theme, index, run });
          payload = await Promise.resolve(maybePromise);
        } catch (error) {
          payload = sourceText;
        }
      }
      const finished = process.hrtime.bigint();
      const durationMs = Number(finished - started) / 1e6;
      timings.push(durationMs);
      stageResults.push(stage ? durationMs : null);
    }
    iterations.push({ timings, payload });
  }

  const metrics = {
    parseMs: null,
    layoutMs: null,
    renderMs: null,
    assembleMs: null,
    totalMs: null,
    outBytes: Buffer.byteLength(typeof iterations[0]?.payload === 'string' ? iterations[0].payload : JSON.stringify(iterations[0]?.payload || sourceText), 'utf8'),
  };

  for (let index = 0; index < stageNames.length; index += 1) {
    const values = iterations.map((entry) => entry.timings[index]).filter((value) => Number.isFinite(value));
    if (values.length === 0) {
      continue;
    }
    const key = `${stageNames[index]}Ms`;
    const metricName = stageNames[index].replace(/^[a-z]/, (letter) => letter.toUpperCase()).replace(/^[A-Z]/, (letter) => letter.toLowerCase());
    if (metricName === 'parse') {
      metrics.parseMs = Number(median(values).toFixed(3));
    } else if (metricName === 'layout') {
      metrics.layoutMs = Number(median(values).toFixed(3));
    } else if (metricName === 'render') {
      metrics.renderMs = Number(median(values).toFixed(3));
    } else if (metricName === 'assemble') {
      metrics.assembleMs = Number(median(values).toFixed(3));
    }
  }

  const totalValues = [metrics.parseMs, metrics.layoutMs, metrics.renderMs, metrics.assembleMs].filter((value) => value !== null);
  metrics.totalMs = totalValues.length > 0 ? Number(totalValues.reduce((sum, value) => sum + value, 0).toFixed(3)) : null;
  return metrics;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.log(JSON.stringify({ parseMs: null, layoutMs: null, renderMs: null, assembleMs: null, totalMs: null, outBytes: 0 }));
    return;
  }

  const inputPath = path.isAbsolute(args.input) ? args.input : path.resolve(process.cwd(), args.input);
  const sourceText = await fs.readFile(inputPath, 'utf8');
  const distModule = await loadDistModule();
  const metrics = await runBench(sourceText, args.theme, distModule);
  const output = args.json ? JSON.stringify(metrics) : JSON.stringify(metrics, null, 2);
  process.stdout.write(output);
}

main().catch(() => {
  const fallback = { parseMs: null, layoutMs: null, renderMs: null, assembleMs: null, totalMs: null, outBytes: 0 };
  process.stdout.write(JSON.stringify(fallback));
});
