# Golden-test procedure

Use a test-only fixture theme rather than adding a new public theme.

## Procedure

1. Place the fixture theme in `test/fixtures/themes/example-theme.ts`.
2. Export it as a `Theme` object, but do not register it in `src/theme/registry.ts`.
3. Import the fixture in `test/golden/example-theme.test.ts`.
4. Assemble the theme twice and assert that both HTML outputs match.
5. Validate the assembled HTML.
6. Compare the assembled HTML to `test/golden/example-theme.html` exactly.

## Verification command

Run:

`node test/run.mjs test/golden/example-theme.test.ts`

The golden HTML should be updated only when the assembled output changes intentionally and the test still passes.
