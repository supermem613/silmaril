# Silmaril for Obsidian

Preview a Silmaril Markdown deck beside the Obsidian editor. The plugin saves
the active editor buffer, waits for a short edit debounce, and renders the same
offline presentation produced by Silmaril.

## Install with BRAT

1. Install and enable the BRAT community plugin.
2. Choose **Add Beta plugin** in BRAT.
3. Enter `supermem613/silmaril`.
4. Enable **Silmaril** under Obsidian's Community plugins.

BRAT installs the `main.js`, `manifest.json`, and `styles.css` assets from the
latest GitHub release.

## Manual install

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create `<vault>/.obsidian/plugins/silmaril-obsidian/`.
3. Copy the three files into that directory.
4. Restart Obsidian and enable **Silmaril** under Community plugins.

To build and install from this checkout on Windows, run:

```powershell
.\install-plugin.ps1 -VaultPath 'C:\path\to\your\vault'
```

The script installs the `obsidian/` package dependencies, builds `main.js`, and
copies `main.js`, `manifest.json`, and `styles.css` into the vault's
`.obsidian/plugins/silmaril-obsidian/` directory.

## Use

Open a Markdown file that uses one optional `#` deck title and one `##` heading
per slide. Run **Open Silmaril preview** from the command palette or use the
presentation ribbon icon. The preview follows the most recently active Markdown
editor and updates after the file saves.
Returning focus to the same note keeps the current preview in place.
Switching to a different note re-renders it, and saved edits still update the
preview.

## Security decision

The preview writes the generated deck to a managed local file and loads its
Obsidian resource URL in an iframe with
`sandbox="allow-scripts allow-same-origin"`. Direct `file://` navigation is not
used because the Obsidian app host does not load it. This combination is
acceptable here only because the frame hosts Silmaril's own
trusted, self-generated deck. It must not host untrusted remote content. The
plugin removes the managed file when the preview closes.

## Community submission

This plugin currently lives in the `obsidian/` subfolder of the Silmaril
repository. BRAT and release assets support this layout, but submission to the
official Obsidian community store may require extracting the plugin into its own
dedicated repository.

## License

Silmaril for Obsidian uses the repository's root [MIT LICENSE](../LICENSE).
