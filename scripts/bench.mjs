#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const input = argv.find((argument) => !argument.startsWith("-"));
  if (!input) {
    throw new Error("Usage: node scripts/bench.mjs <input.md> [--json]");
  }
  return { input, json: argv.includes("--json") };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), args.input);
  const source = await fs.readFile(inputPath, "utf8");
  const pipeline = await import(pathToFileURL(path.resolve(scriptDirectory, "../dist/index.js")).href);
  const manifest = JSON.parse(await fs.readFile(path.resolve(scriptDirectory, "../package.json"), "utf8"));
  const started = process.hrtime.bigint();
  const board = pipeline.parseBoard(source, path.basename(inputPath, path.extname(inputPath)));
  const slides = board.slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    content: pipeline.renderMarkdown(pipeline.inlineMarkdown(slide.body, path.dirname(inputPath)).markdown),
    markdownSource: slide.body,
  }));
  const html = pipeline.buildPresentation(slides, {
    documentTitle: board.title,
    version: manifest.version,
    repositoryUrl: manifest.repository?.url,
  });
  pipeline.validateBuildOutput(html);
  const metrics = {
    totalMs: Number((Number(process.hrtime.bigint() - started) / 1e6).toFixed(3)),
    outBytes: Buffer.byteLength(html, "utf8"),
  };
  process.stdout.write(args.json ? JSON.stringify(metrics) : JSON.stringify(metrics, null, 2));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ totalMs: null, outBytes: 0 }));
  process.exitCode = 1;
});
