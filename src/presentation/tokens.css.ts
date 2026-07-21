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
    --token-mermaid-node-fill: #212D36;
    --token-mermaid-node-fill-diamond: #362621;
    --token-mermaid-node-fill-ellipse: #363121;
    --token-mermaid-node-text: var(--text);
    --token-mermaid-edge: #8E959E;
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
    --token-mermaid-node-fill: #DEEAF2;
    --token-mermaid-node-fill-diamond: #F2E4DE;
    --token-mermaid-node-fill-ellipse: #F2EEDE;
    --token-mermaid-node-text: var(--text);
    --token-mermaid-edge: #767D86;
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
  }

  .engineering-board-signature a {
    color: inherit;
    text-decoration: none;
    pointer-events: auto;
  }

  .engineering-board-signature a:hover {
    color: var(--text);
    text-decoration: underline;
  }

  .engineering-board-signature a:focus-visible {
    border-radius: 0.15rem;
    outline: 2px solid var(--accent-strong);
    outline-offset: 2px;
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
    stroke: none;
  }

  .engineering-mermaid .mermaid-node--diamond {
    fill: var(--token-mermaid-node-fill-diamond);
  }

  .engineering-mermaid .mermaid-node--ellipse {
    fill: var(--token-mermaid-node-fill-ellipse);
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
    stroke-width: 1.5;
  }

  .engineering-mermaid .mermaid-arrowhead {
    fill: var(--token-mermaid-edge);
    stroke: none;
  }

  .engineering-mermaid .mermaid-edge-label-bg {
    fill: var(--surface);
    opacity: 0.9;
  }

  .engineering-mermaid .mermaid-edge-label {
    fill: var(--token-mermaid-label);
    font-size: 11px;
    font-weight: 600;
    font-family: inherit;
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

  body:not(:has(.step.active[data-id="overview"])) .step:not(.active) {
    visibility: hidden;
    opacity: 0 !important;
    pointer-events: none;
  }

  .engineering-slide-cue {
    position: fixed;
    top: 50%;
    z-index: 9000;
    color: var(--muted);
    font-family: "Segoe UI Variable Display", "Aptos Display", "Segoe UI", sans-serif;
    font-size: 1.6rem;
    font-weight: 400;
    line-height: 1;
    opacity: 0.55;
    pointer-events: none;
    transform: translateY(-50%);
  }

  .engineering-slide-cue[hidden] {
    display: none;
  }

  .engineering-slide-cue--previous {
    left: 0.75rem;
  }

  .engineering-slide-cue--next {
    right: 0.75rem;
  }

  body:not(:has(.step.active[data-id="overview"])) .step.active .engineering-card {
    transition: none;
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
