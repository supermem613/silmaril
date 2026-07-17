import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { auditDeterminism } from '../../src/pipeline/determinism.js';
import { listThemes } from '../../src/theme/registry.js';

test('auditDeterminism audits the real public themes', () => {
  const auditResult = auditDeterminism();
  const publicThemes = listThemes();

  assert.equal(auditResult.ok, true, 'expected each audited theme to be deterministic');
  assert.deepEqual(
    auditResult.themes.map((theme) => theme.name),
    publicThemes,
    'expected the audit to cover the current public theme registry',
  );
  assert.equal(auditResult.themeCount, publicThemes.length, 'expected the audit count to match the registry size');

  for (const theme of auditResult.themes) {
    assert.equal(theme.sha256, theme.repeatedSha256, `${theme.name} should hash identically across repeated renders`);
    assert.equal(theme.consistent, true, `${theme.name} should be internally consistent`);
    assert.deepEqual(theme.bannedPatternMatches, [], `${theme.name} should contain no banned audit signals`);
  }
});
