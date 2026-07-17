# Silmaril schema reference

Silmaril exposes four public commands and a small set of JSON-oriented flags. The `schema` command returns the machine-readable catalog that this document summarizes.

## Command catalog

### `doctor`

- Purpose: verify the local environment and configuration.
- Effect: `read`
- Flags: `--json`
- Exit: `0` when checks pass; `1` when any check fails.
- Output envelope: success uses `{"ok":true,"command":"doctor","data":{...},"warnings":[]}`; failure uses `{"ok":false,"command":"doctor","error":"doctor-failed","hint":"..."}`.

### `schema`

- Purpose: emit the machine-readable command catalog.
- Effect: `read`
- Positionals: `path...`
- Flags: `--summary`
- Exit: `0` on success.
- Output envelope: success uses `{"ok":true,"command":"schema","data":{...},"warnings":[]}`.

### `build`

- Purpose: compile a markdown scene into a single-file HTML presentation.
- Effect: `mutate-local`
- Positionals: `input`
- Flags: `--out`, `--theme`, `--emit-scene`, `--open`
- Exit: `0` on success; `1` when options are invalid or the build fails.
- Output envelope: success uses `{"ok":true,"command":"build","data":{"outputPath":...,"byteCount":...,"theme":...},"warnings":[]}`; failure uses `{"ok":false,"command":"build","error":"invalid-options|build-failed","hint":"..."}`.

### `update`

- Purpose: self-update this Silmaril checkout with `git pull`, `npm install`, and `npm run build`.
- Effect: `mutate-local`
- Flags: `--json`
- Exit: `0` when the repo is already current and the command completes; `1` when update fails.
- Output envelope: success uses `{"ok":true,"command":"update","data":{...},"warnings":[]}`; failure uses `{"ok":false,"command":"update","error":"UPDATE_FAILED","hint":"..."}`.

## Global flags

- `--help`: show CLI help.
- `--version`: show the CLI version.

## Envelope contract

All non-interactive commands emit JSON to standard output. The envelope has the same shape everywhere:

```json
{"ok":true,"command":"build","data":{},"warnings":[]}
```

and for failures:

```json
{"ok":false,"command":"build","error":"invalid-options","hint":"...","warnings":[]}
```

The `warnings` array is currently empty for the shipped commands. `stderr` carries human-readable progress or hints.

## Examples

```bash
silmaril doctor --json
silmaril schema
silmaril schema doctor --summary
silmaril build docs/examples/quick.md --out ./silmaril-quick.html --theme sketch
silmaril update --json
```

The command catalog always documents the public surface, so `schema` is the best place to confirm new flags such as `--out`, `--summary`, `--theme`, `--open`, `--json`, and `--emit-scene`.
