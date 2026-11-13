import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

const readDoc = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('documentation covers the serve, live reload, version, and emphasis workflow', () => {
  const readme = readDoc('../../README.md');
  const authoring = readDoc('../../docs/authoring.md');
  const docs = [
    ['README.md', readme],
    ['docs/authoring.md', authoring],
  ] as const;

  assert.match(readme, /\| `silmaril publish <input>` \|/i, "README should document silmaril publish in the command table");
  assert.match(readme, /`publish` accepts `--out <file>` and `--open`/i, "README should describe publish in prose");

  for (const [name, content] of docs) {
    assert.match(content, /focused/i, `${name} should describe the focused-slide flow`);
    assert.match(content, /silmaril serve/i, `${name} should document the serve command`);
    assert.match(content, /live reload/i, `${name} should describe live reload`);
    assert.match(content, /your own editor/i, `${name} should say editing happens in your own editor`);
    assert.match(content, /source of truth/i, `${name} should describe the durable source of truth`);
    assert.match(content, /silmaril · <version>/i, `${name} should document the version signature`);
    assert.match(content, /WCAG AA/i, `${name} should mention WCAG AA contrast`);
  }
});

test('documentation covers the output directive and presentation default', () => {
  const readme = readDoc('../../README.md');
  const authoring = readDoc('../../docs/authoring.md');
  const schema = readDoc('../../docs/schema.md');

  for (const [name, content] of [
    ['README.md', readme],
    ['docs/authoring.md', authoring],
  ] as const) {
    assert.match(content, /:::silmaril document/, `${name} should document the document directive`);
    assert.match(content, /:::silmaril presentation/, `${name} should document the explicit presentation directive`);
    assert.match(content, /presentation remains the default|defaults to presentation|without an output directive|omit the directive/i, `${name} should document the presentation default`);
  }

  assert.match(schema, /"type": "presentation"/, 'schema should document the publish output type');
  assert.match(schema, /`type` is `"presentation"`/, 'schema should explain presentation and document types');
});
