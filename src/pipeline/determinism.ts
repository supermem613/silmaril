import { createHash } from 'node:crypto';
import type { Theme } from '../theme/contract.js';
import { getTheme, listThemes } from '../theme/registry.js';
import { assemble, type Region } from './assemble.js';

export const SILMARIL_NOT_IMPLEMENTED_DETERMINISM = 'SILMARIL_NOT_IMPLEMENTED_DETERMINISM';

export interface DeterminismThemeAuditResult {
  readonly name: string;
  readonly sha256: string;
  readonly repeatedSha256: string;
  readonly consistent: boolean;
  readonly outputLength: number;
  readonly bannedPatternMatches: readonly string[];
}

export interface DeterminismAuditResult {
  readonly ok: boolean;
  readonly themeCount: number;
  readonly themes: readonly DeterminismThemeAuditResult[];
  readonly bannedPatternMatches: Readonly<Record<string, readonly string[]>>;
}

const AUDIT_PATTERNS: ReadonlyArray<{ readonly name: string; readonly pattern: RegExp }> = [
  { name: 'timestamp', pattern: /\d{4}-\d{2}-\d{2}(?:[T ][0-9:.]+)?/ },
  { name: 'math-random', pattern: /Math\.random/ },
  { name: 'random-id', pattern: /\b(?:id|data-id)=["'][0-9a-f]{8,}["']/i },
];

function hashOutput(output: string): string {
  return createHash('sha256').update(output, 'utf8').digest('hex');
}

function collectAuditSignals(output: string): string[] {
  return AUDIT_PATTERNS.filter(({ pattern }) => pattern.test(output)).map(({ name }) => name);
}

function createSampleRegions(themeName: string): readonly Region[] {
  return [
    { id: `${themeName}-overview`, title: `${themeName} overview`, content: `A concise landing view for ${themeName}.` },
    { id: `${themeName}-detail`, title: `${themeName} detail`, content: `A compact detail scene for ${themeName}.` },
    { id: `${themeName}-finish`, title: `${themeName} finish`, content: `A closing summary for ${themeName}.` },
  ];
}

function buildThemeOutput(themeName: string): string {
  const theme = getTheme(themeName) as Theme;
  const regions = createSampleRegions(themeName);
  return assemble(theme, regions);
}

export function auditDeterminism(): DeterminismAuditResult {
  const themeNames = listThemes();
  const themes = themeNames.map((themeName) => {
    const firstOutput = buildThemeOutput(themeName);
    const secondOutput = buildThemeOutput(themeName);
    const firstHash = hashOutput(firstOutput);
    const secondHash = hashOutput(secondOutput);
    const bannedPatternMatches = collectAuditSignals(`${firstOutput}\n${secondOutput}`);

    return {
      name: themeName,
      sha256: firstHash,
      repeatedSha256: secondHash,
      consistent: firstHash === secondHash && bannedPatternMatches.length === 0,
      outputLength: firstOutput.length,
      bannedPatternMatches,
    } satisfies DeterminismThemeAuditResult;
  });

  const bannedPatternMatches = Object.fromEntries(
    themes.map((theme) => [theme.name, theme.bannedPatternMatches]),
  ) as Readonly<Record<string, readonly string[]>>;

  return {
    ok: themes.every((theme) => theme.consistent),
    themeCount: themes.length,
    themes,
    bannedPatternMatches,
  };
}
