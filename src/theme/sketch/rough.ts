interface RoughOpsSet {
  readonly ops: ReadonlyArray<{ readonly op: string; readonly data: ReadonlyArray<number> }>;
}

interface RoughShape {
  readonly sets: ReadonlyArray<RoughOpsSet>;
}

interface RoughGenerator {
  line: (x1: number, y1: number, x2: number, y2: number, options: Record<string, unknown>) => RoughShape;
  rectangle: (x: number, y: number, width: number, height: number, options: Record<string, unknown>) => RoughShape;
  circle: (x: number, y: number, diameter: number, options: Record<string, unknown>) => RoughShape;
  opsToPath: (set: RoughOpsSet, precision?: number) => string;
}

import { createRequire } from 'node:module';

interface RoughModule {
  generator: () => RoughGenerator;
}

const require = createRequire(import.meta.url);
const rough = require('roughjs/bundled/rough.esm.js').default as RoughModule;

const generator = rough.generator();
let seedValue = 1000;

export function resetSketchSeeds(): void {
  seedValue = 1000;
}

function nextSeed(): number {
  seedValue += 1;
  return seedValue;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function createPathMarkup(shape: RoughShape, stroke: string, strokeWidth: number): string {
  return shape.sets
    .map((set) => {
      const d = generator.opsToPath(set, 2);
      return `<path d="${escapeAttribute(d)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
    })
    .join('');
}

export function createSketchLine(x1: number, y1: number, x2: number, y2: number, stroke: string): string {
  const shape = generator.line(x1, y1, x2, y2, {
    seed: nextSeed(),
    stroke,
    strokeWidth: 2.3,
    roughness: 1.2,
    bowing: 0.7,
  }) as RoughShape;
  return createPathMarkup(shape, stroke, 2.3);
}

export function createSketchBox(x: number, y: number, width: number, height: number, stroke: string): string {
  const shape = generator.rectangle(x, y, width, height, {
    seed: nextSeed(),
    stroke,
    strokeWidth: 2.4,
    roughness: 1.1,
    bowing: 0.65,
    fill: 'none',
  }) as RoughShape;
  return createPathMarkup(shape, stroke, 2.4);
}

export function createSketchCircle(cx: number, cy: number, radius: number, stroke: string): string {
  const shape = generator.circle(cx, cy, radius * 2, {
    seed: nextSeed(),
    stroke,
    strokeWidth: 2.2,
    roughness: 1.15,
    bowing: 0.7,
    fill: 'none',
  }) as RoughShape;
  return createPathMarkup(shape, stroke, 2.2);
}

export function createSketchDot(cx: number, cy: number, radius: number, stroke: string): string {
  const shape = generator.circle(cx, cy, radius * 2, {
    seed: nextSeed(),
    stroke,
    strokeWidth: 2.2,
    roughness: 0.9,
    bowing: 0.45,
    fill: 'none',
  }) as RoughShape;
  return createPathMarkup(shape, stroke, 2.2);
}
