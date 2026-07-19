export const engineeringTokensCss = `
  .engineering-shell {
    --light-bg: #f4f3eb;
    --light-surface: #fcfbf4;
    --light-text: #14212c;
    --light-muted: #506174;
    --light-border: #b7b49e;
    --light-accent: #1f6f8b;
    --light-accent-strong: #0d4657;
    --light-code-bg: #f0ebdf;
    --light-code-text: #1f3140;
    --light-shadow: rgba(15, 23, 42, 0.16);
    --dark-bg: #0B0D0E;
    --dark-surface: #12161A;
    --dark-text: #F3F7F6;
    --dark-muted: #8A959D;
    --dark-border: #2A3338;
    --dark-accent: #67D3C2;
    --dark-accent-strong: #8CE4D3;
    --dark-code-bg: #171C22;
    --dark-code-text: #E8F4F0;
    --dark-shadow: rgba(0, 0, 0, 0.36);
    --surface: var(--dark-surface);
    --text: var(--dark-text);
    --muted: var(--dark-muted);
    --border: var(--dark-border);
    --accent: var(--dark-accent);
    --accent-strong: var(--dark-accent-strong);
    --code-bg: var(--dark-code-bg);
    --code-text: var(--dark-code-text);
    --shadow: var(--dark-shadow);
    --token-mermaid-node-fill: #13384b;
    --token-mermaid-node-stroke: var(--accent);
    --token-mermaid-node-text: var(--text);
    --token-mermaid-edge: var(--accent-strong);
    --token-mermaid-label: var(--muted);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 0 auto 1.25rem;
    padding: 1rem 1.25rem;
    max-width: 980px;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: linear-gradient(140deg, var(--dark-bg), var(--surface));
    box-shadow: 0 20px 40px var(--shadow);
    color: var(--text);
    font-family: "Inter", "Segoe UI", Roboto, sans-serif;
    line-height: 1.5;
  }

  .engineering-shell[data-theme="light"] {
    --surface: var(--light-surface);
    --text: var(--light-text);
    --muted: var(--light-muted);
    --border: var(--light-border);
    --accent: var(--light-accent);
    --accent-strong: var(--light-accent-strong);
    --code-bg: var(--light-code-bg);
    --code-text: var(--light-code-text);
    --shadow: var(--light-shadow);
    --token-mermaid-node-fill: #dfe9ef;
    --token-mermaid-node-stroke: var(--accent);
    --token-mermaid-node-text: var(--text);
    --token-mermaid-edge: var(--accent);
    --token-mermaid-label: var(--muted);
    background: linear-gradient(140deg, var(--light-bg), var(--surface));
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

  .engineering-shell__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .engineering-shell__title {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-size: 0.73rem;
    color: var(--accent);
  }

  .engineering-shell__title span:last-child {
    color: var(--text);
    font-size: 0.95rem;
    letter-spacing: 0.02em;
    text-transform: none;
    font-weight: 600;
  }

  .engineering-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: var(--text);
    padding: 0.6rem 0.9rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
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
    gap: 0.9rem;
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 1.2rem 1.3rem;
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 18px 40px var(--shadow);
    transition: background 180ms ease, color 180ms ease, border-color 180ms ease;
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
    background: var(--surface);
    color: var(--text);
  }

  .engineering-card__eyebrow {
    display: inline-flex;
    width: fit-content;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.25rem 0.6rem;
    font-size: 0.75rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
    background: rgba(103, 211, 194, 0.12);
  }

  .engineering-card h2 {
    margin: 0;
    font-size: 1.6rem;
    color: var(--text);
  }

  .engineering-card p,
  .engineering-card li,
  .engineering-card td,
  .engineering-card th {
    color: var(--text);
  }

  .engineering-card p {
    margin: 0;
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
