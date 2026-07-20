# Command schema

`silmaril schema` prints the public command catalog as JSON.

```sh
node dist/cli.js schema
node dist/cli.js schema build
node dist/cli.js schema --summary
```

## Build

```text
silmaril build <input> [--out <file>] [--open]
```

The success envelope contains:

```json
{
  "ok": true,
  "command": "build",
  "data": {
    "outputPath": "C:\\path\\to\\talk.html",
    "byteCount": 12345,
    "slideCount": 4,
    "open": null
  },
  "warnings": []
}
```

`open` is `null` unless `--open` is used. When requested, it records whether launch was requested and the output path passed to the default application.

## Other commands

- `doctor [--json]`
- `schema [path...] [--summary]`
- `update [--json]`

Every command uses exit code `0` for success and `1` for failure. Machine-readable commands write JSON to standard output.
