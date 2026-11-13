# Command schema

`silmaril schema` prints the public command catalog as JSON.

```sh
node dist/cli.js schema
node dist/cli.js schema publish
node dist/cli.js schema --summary
```

## Publish

```text
silmaril publish <input> [--out <file>] [--open]
```

The success envelope contains:

```json
{
  "ok": true,
  "command": "publish",
  "data": {
    "outputPath": "C:\\path\\to\\talk.html",
    "byteCount": 12345,
    "slideCount": 4,
    "type": "presentation",
    "open": null
  },
  "warnings": []
}
```

`open` is `null` unless `--open` is used. When requested, it records whether launch was requested and the output path passed to the default application.

`type` is `"presentation"` when the Markdown contains no output directive or explicitly uses `:::silmaril presentation`; it is `"document"` when the Markdown uses `:::silmaril document`.

## Other commands

- `doctor [--json]`
- `schema [path...] [--summary]`
- `serve <input> [--port <port>] [--open]`
- `update [--json]`

Every command uses exit code `0` for success and `1` for failure. Machine-readable commands write JSON to standard output.
