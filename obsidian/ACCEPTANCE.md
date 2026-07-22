# Manual acceptance checklist

This is a manual Obsidian desktop check, not an automated gate. It extends the
three passing spike checks to the live render flow from the active editor buffer
through the Blob URL iframe.

## Side-load

1. Run `npm install --no-package-lock` in `obsidian`.
2. Run `npm run build` in `obsidian`.
3. Copy `main.js`, `manifest.json`, and `styles.css` into
   `<vault>/.obsidian/plugins/silmaril-obsidian/`.
4. Restart Obsidian, enable **Silmaril** under Community plugins, open a Markdown
   deck, and run **Open Silmaril preview**.
5. Open Obsidian developer tools and keep the Console and Performance panels
   visible while completing the checks.

## Pass/Fail

| Check | Pass criteria | Pass/Fail |
| --- | --- | --- |
| Live saved buffer | Edit a `##` slide in short bursts. The file saves before the Blob preview updates, and the newest text appears. | |
| Debounce and stale results | Type several changes inside 250 ms. The preview updates once after the burst and never reverts to an older render. | |
| Render latency | A typical two-slide deck updates within 500 ms after the 250 ms debounce without blocking editor input. | |
| Inline script under CSP | The generated deck's inline script executes in the Obsidian desktop CSP. | |
| Arrow navigation | Left and right arrow keys drive Impress slide navigation inside the focused preview. | |
| Blob iframe | The preview loads from a Blob URL with the expected deck content, not a blank `srcdoc` frame. | |
| Failure reporting | A save or render failure produces a visible Silmaril notice and does not replace the last good preview. | |
| Security console | The live flow produces no red CSP or security console errors. | |
| Cleanup | Closing the preview removes the view and revokes its active Blob URL without later updates. | |
