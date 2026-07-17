import type { Theme } from './contract.js';
import { atlasTheme } from './atlas/index.js';
import { cardsTheme } from './cards/index.js';
import { plainTheme } from './plain.js';
import { sketchTheme } from './sketch/index.js';

const themeFactories: Readonly<Record<string, () => Theme>> = {
  atlas: atlasTheme,
  cards: cardsTheme,
  plain: plainTheme,
  sketch: sketchTheme,
};

export function getTheme(name: string): Theme {
  const factory = themeFactories[name];
  if (!factory) {
    throw new Error(
      `The ${name} theme is unavailable, so the ${name} golden assertion fails for the named missing behavior.`,
    );
  }
  return factory();
}

export function listThemes(): readonly string[] {
  return Object.keys(themeFactories).sort();
}
