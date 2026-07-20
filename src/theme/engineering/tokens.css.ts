export const engineeringTokensCss = `
  :root {
    --light-bg: #EEF2F3;
    --light-surface: #FFFFFF;
    --light-text: #111820;
    --light-muted: #52606B;
    --light-border: #C8D0D5;
    --light-accent: #136F63;
    --light-accent-strong: #0B5148;
    --light-code-bg: #E8EEF0;
    --light-code-text: #14212C;
    --light-shadow: rgba(15, 23, 42, 0.14);
    --light-strong: #7C4700;
    --dark-bg: #000000;
    --dark-surface: #14191D;
    --dark-text: #F3F7F6;
    --dark-muted: #B2BDC3;
    --dark-border: #354047;
    --dark-accent: #67D3C2;
    --dark-accent-strong: #9BE9DC;
    --dark-code-bg: #1B2228;
    --dark-code-text: #F1FAF7;
    --dark-shadow: rgba(0, 0, 0, 0.42);
    --dark-strong: #D98C00;
    --surface: var(--dark-surface);
    --text: var(--dark-text);
    --muted: var(--dark-muted);
    --border: var(--dark-border);
    --accent: var(--dark-accent);
    --accent-strong: var(--dark-accent-strong);
    --code-bg: var(--dark-code-bg);
    --code-text: var(--dark-code-text);
    --shadow: var(--dark-shadow);
    --strong: var(--dark-strong);
    --token-mermaid-node-fill: #13384B;
    --token-mermaid-node-stroke: var(--accent);
    --token-mermaid-node-text: var(--text);
    --token-mermaid-edge: var(--accent-strong);
    --token-mermaid-label: var(--muted);
  }

  html,
  body.engineering-theme {
    height: 100%;
    margin: 0;
    overflow: hidden;
    background: var(--dark-bg);
    color: var(--text);
    font-family: "Segoe UI Variable Text", "Aptos", "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  html[data-theme="light"],
  body.engineering-theme[data-theme="light"] {
    --surface: var(--light-surface);
    --text: var(--light-text);
    --muted: var(--light-muted);
    --border: var(--light-border);
    --accent: var(--light-accent);
    --accent-strong: var(--light-accent-strong);
    --code-bg: var(--light-code-bg);
    --code-text: var(--light-code-text);
    --shadow: var(--light-shadow);
    --strong: var(--light-strong);
    --token-mermaid-node-fill: #DFE9EF;
    --token-mermaid-node-stroke: var(--accent);
    --token-mermaid-node-text: var(--text);
    --token-mermaid-edge: var(--accent);
    --token-mermaid-label: var(--muted);
    background: var(--light-bg);
  }

  .engineering-shell {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 10000;
    pointer-events: none;
    transition: opacity 180ms ease, transform 180ms ease;
  }

  body:not(:has(.step.active[data-id="overview"])) .engineering-shell {
    opacity: 0;
    transform: translateY(-0.5rem);
  }

  body:not(:has(.step.active[data-id="overview"])) .engineering-toggle {
    pointer-events: none;
  }

  .engineering-board-overview {
    position: relative;
  }

  .engineering-board-title {
    position: absolute;
    top: 2rem;
    left: 3rem;
    right: 3rem;
    color: var(--text);
    font-family: "Segoe UI Variable Display", "Aptos Display", "Segoe UI", sans-serif;
  }

  .engineering-board-title h1 {
    margin: 0;
    font-size: 3.4rem;
    font-weight: 650;
    letter-spacing: -0.035em;
    line-height: 1;
  }

  .engineering-board-signature {
    position: absolute;
    right: 1rem;
    bottom: 1rem;
    z-index: 2;
    color: var(--muted);
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.025em;
    opacity: 0.68;
    pointer-events: none;
  }

  .engineering-slide-progress {
    position: fixed;
    left: 1.25rem;
    bottom: 1.25rem;
    z-index: 10000;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    pointer-events: none;
  }

  .engineering-slide-progress[hidden] {
    display: none;
  }

  html[data-theme="light"] .engineering-board-title,
  body.engineering-theme[data-theme="light"] .engineering-board-title {
    color: #14212c;
  }

  .engineering-mermaid {
    display: block;
    width: 100%;
    height: auto;
    margin: 0.25rem 0;
  }

  .engineering-mermaid .mermaid-node {
    fill: var(--token-mermaid-node-fill);
    stroke: var(--token-mermaid-node-stroke);
    stroke-width: 2;
  }

  .engineering-mermaid .mermaid-node-text {
    fill: var(--token-mermaid-node-text);
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
  }

  .engineering-mermaid .mermaid-edge {
    fill: none;
    stroke: var(--token-mermaid-edge);
    stroke-width: 2.5;
  }

  .engineering-editor-shell {
    position: fixed;
    right: 0;
    bottom: 1.25rem;
    z-index: 10000;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.6rem;
    pointer-events: auto;
  }

  .engineering-editor-drawer {
    display: inline-flex;
    align-items: stretch;
  }

  .engineering-editor-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.25rem;
    border: 1px solid var(--border);
    border-radius: 0.75rem 0 0 0.75rem;
    background: color-mix(in srgb, var(--surface) 90%, transparent);
    box-shadow: 0 8px 24px var(--shadow);
    backdrop-filter: blur(12px);
  }

  .engineering-editor-actions[hidden] {
    display: none;
  }

  .engineering-editor-drawer-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.15rem;
    min-height: 2.5rem;
    border: 1px solid var(--border);
    border-right: 0;
    border-radius: 0.65rem 0 0 0.65rem;
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    color: var(--text);
    font-family: inherit;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    backdrop-filter: blur(12px);
    transition: width 180ms ease, background 180ms ease, color 180ms ease;
  }

  .engineering-editor-drawer-toggle:hover {
    width: 2.4rem;
    background: color-mix(in srgb, var(--accent) 16%, var(--surface));
    color: var(--accent-strong);
  }

  .engineering-editor-drawer-toggle:focus-visible {
    outline: 3px solid var(--accent-strong);
    outline-offset: 3px;
  }

  body:has(.step.active[data-id="overview"]) .engineering-editor-shell {
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
  }

  .engineering-editor-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2rem;
    border: 0;
    border-radius: 0.5rem;
    background: transparent;
    color: var(--text);
    padding: 0.4rem 0.65rem;
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    pointer-events: auto;
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  .engineering-editor-toggle:hover {
    transform: translateY(-1px);
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .engineering-editor-toggle:focus-visible {
    outline: 3px solid var(--accent-strong);
    outline-offset: 3px;
  }

  .engineering-editor-panel {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    width: min(30rem, 82vw);
    max-height: min(24rem, 70vh);
    margin-right: 2.15rem;
    padding: 0.9rem;
    border: 1px solid var(--border);
    border-radius: 0.9rem;
    background: color-mix(in srgb, var(--surface) 90%, transparent);
    box-shadow: 0 14px 36px var(--shadow);
    backdrop-filter: blur(14px);
  }

  .engineering-editor-panel[hidden] {
    display: none;
  }

  .engineering-editor-panel__label {
    color: var(--text);
    font-size: 0.83rem;
    font-weight: 600;
  }

  .engineering-editor-panel__input {
    min-height: 11rem;
    border: 1px solid var(--border);
    border-radius: 0.7rem;
    padding: 0.8rem 0.9rem;
    background: color-mix(in srgb, var(--surface) 94%, transparent);
    color: var(--text);
    font: inherit;
    resize: vertical;
  }

  .engineering-editor-panel__input:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 2px;
  }

  .engineering-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    color: var(--text);
    padding: 0.45rem 0.75rem;
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    pointer-events: auto;
    backdrop-filter: blur(12px);
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  .engineering-toggle:hover {
    transform: translateY(-1px);
    border-color: var(--accent);
  }

  .engineering-toggle:focus-visible {
    outline: 3px solid var(--accent-strong);
    outline-offset: 3px;
  }

  .engineering-card {
    display: flex;
    flex-direction: column;
    gap: 1.35rem;
    width: 1000px;
    min-height: 700px;
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 3rem 3.5rem;
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 18px 40px var(--shadow);
    font-family: "Segoe UI Variable Text", "Aptos", "Segoe UI", sans-serif;
    font-size: 1.35rem;
    line-height: 1.5;
    transition: transform 240ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease, box-shadow 240ms ease;
  }

  .engineering-card[data-theme="light"] {
    --surface: var(--light-surface);
    --text: var(--light-text);
    --muted: var(--light-muted);
    --border: var(--light-border);
    --accent: var(--light-accent);
    --accent-strong: var(--light-accent-strong);
    --code-bg: var(--light-code-bg);
    --code-text: var(--light-code-text);
    --shadow: var(--light-shadow);
    --strong: var(--light-strong);
    background: var(--surface);
    color: var(--text);
  }

  .engineering-card[data-theme="dark"] {
    --surface: var(--dark-surface);
    --text: var(--dark-text);
    --muted: var(--dark-muted);
    --border: var(--dark-border);
    --accent: var(--dark-accent);
    --accent-strong: var(--dark-accent-strong);
    --code-bg: var(--dark-code-bg);
    --code-text: var(--dark-code-text);
    --shadow: var(--dark-shadow);
    --strong: var(--dark-strong);
    background: #000000;
    color: var(--text);
  }

  body:not(:has(.step.active[data-id="overview"])) .step.active .engineering-card[data-theme="dark"] {
    background: #000000;
    border-color: transparent;
    box-shadow: none;
  }

  .engineering-card strong {
    color: var(--strong);
  }

  .engineering-card h2 {
    margin: 0;
    font-family: "Segoe UI Variable Display", "Aptos Display", "Segoe UI", sans-serif;
    font-size: 3rem;
    font-weight: 650;
    letter-spacing: -0.035em;
    line-height: 1.05;
    color: var(--text);
  }

  .engineering-card p,
  .engineering-card li,
  .engineering-card td,
  .engineering-card th {
    color: var(--text);
  }

  .engineering-card__content {
    display: contents;
  }

  .engineering-card p {
    margin: 0;
  }

  .engineering-card ul,
  .engineering-card ol {
    margin: 0;
    padding-left: 1.4em;
  }

  .engineering-card li + li {
    margin-top: 0.35em;
  }

  body:has(.step.active[data-id="overview"]) .step:not(.overview) {
    cursor: pointer;
  }

  body:has(.step.active[data-id="overview"]) .step:not(.overview):hover .engineering-card,
  body:has(.step.active[data-id="overview"]) .step:not(.overview):focus-visible .engineering-card {
    transform: translateY(-12px) scale(1.015);
    border-color: var(--accent);
    box-shadow: 0 28px 60px var(--shadow);
  }

  body:has(.step.active[data-id="overview"]) .step:not(.overview):focus-visible {
    outline: none;
  }

  .engineering-card table {
    width: 100%;
    border-collapse: collapse;
    overflow: hidden;
    border-radius: 0.75rem;
  }

  .engineering-card th,
  .engineering-card td {
    border: 1px solid var(--border);
    padding: 0.7rem 0.8rem;
    text-align: left;
  }

  .engineering-card th {
    background: rgba(103, 211, 194, 0.14);
    color: var(--accent-strong);
  }

  .engineering-card pre {
    margin: 0;
    padding: 1rem 1.1rem;
    border-radius: 0.8rem;
    background: var(--code-bg);
    color: var(--code-text);
    border: 1px solid var(--border);
    overflow: auto;
  }

  .engineering-card code {
    font-family: "Cascadia Code", Consolas, monospace;
    background: rgba(103, 211, 194, 0.12);
    border-radius: 0.3rem;
    padding: 0.12rem 0.3rem;
    color: var(--code-text);
  }

  .engineering-card img {
    width: 100%;
    max-width: 100%;
    border-radius: 0.8rem;
    border: 1px solid var(--border);
  }

  .engineering-card blockquote {
    margin: 0;
    padding: 0.75rem 1rem;
    border-left: 3px solid var(--accent);
    color: var(--muted);
    background: rgba(103, 211, 194, 0.08);
  }

  .engineering-card hr {
    border: 0;
    border-top: 1px solid var(--border);
    margin: 0.1rem 0 0.3rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .engineering-toggle,
    .engineering-card {
      transition: none !important;
    }
  }
`;
