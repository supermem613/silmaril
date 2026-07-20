import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

const readDoc = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('documentation covers the editing, export, version, and emphasis workflow', () => {
  const readme = readDoc('../../README.md');
  const authoring = readDoc('../../docs/authoring.md');
  const docs = [
    ['README.md', readme],
    ['docs/authoring.md', authoring],
  ] as const;

  for (const [name, content] of docs) {
    assert.match(content, /focused slide/i, `${name} should describe the focused-slide editing flow`);
    assert.match(content, /live preview/i, `${name} should describe the live preview`);
    assert.match(content, /source of truth/i, `${name} should describe the durable source of truth`);
    assert.match(content, /export markdown/i, `${name} should describe export`);
    assert.match(content, /File System Access/i, `${name} should mention the native File System Access path`);
    assert.match(content, /download fallback/i, `${name} should mention the download fallback`);
    assert.match(content, /silmaril · <version>/i, `${name} should document the version signature`);
    assert.match(content, /WCAG AA/i, `${name} should mention WCAG AA contrast`);
    assert.match(content, /live preview matches the rendered slide/i, `${name} should state that preview emphasis matches the rendered slide`);
  }
});
