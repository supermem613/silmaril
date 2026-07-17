# Vendored runtime presentation assets

This directory contains runtime assets that are bundled into presentation output without network access.

- `impress.min.js`: copied from `node_modules/impress.js@1.1.0/js/impress.min.js` during the offline asset pinning step. It provides the presentation runtime for single-file output.
- The repository keeps dependency versions pinned in `package.json` and `package-lock.json` so builds remain deterministic.
- The Kalam font data URI is stored separately in `assets/fonts/kalam.woff2.base64.txt` and is sourced from the approved HTML template at `C:/Users/marcusm/.copilot/skills/html/templates/sketch-font.html`.
