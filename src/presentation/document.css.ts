export const engineeringDocumentCss = `
  html,
  body.engineering-document {
    height: auto;
    min-height: 100%;
    margin: 0;
    overflow: auto;
    background: var(--dark-bg);
    color: var(--text);
  }

  .engineering-document__page {
    min-height: 100vh;
    box-sizing: border-box;
    background: var(--dark-bg);
  }

  .engineering-document__header,
  .engineering-document__sections {
    width: min(1040px, calc(100% - 3rem));
    margin: 0 auto;
  }

  .engineering-document__header {
    padding: 4rem 0 2rem;
  }

  .engineering-document__header h1 {
    margin: 0;
    color: var(--text);
    font-family: "Segoe UI Variable Display", "Aptos Display", "Segoe UI", sans-serif;
    font-size: clamp(2.8rem, 7vw, 5rem);
    font-weight: 650;
    letter-spacing: -0.035em;
    line-height: 1.05;
  }

  .engineering-document__header .engineering-board-subtitle {
    max-width: 760px;
  }

  .engineering-document__sections {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-bottom: 5rem;
  }

  .engineering-document__section {
    box-sizing: border-box;
    width: 100%;
    min-height: 0;
    color: var(--text);
    font-family: "Segoe UI Variable Text", "Aptos", "Segoe UI", sans-serif;
    font-size: 1.35rem;
    line-height: 1.5;
  }

  .engineering-document__section--section {
    align-items: center;
    justify-content: center;
    min-height: 0;
    text-align: center;
  }

  .engineering-document__section-subtitle {
    max-width: 760px;
    margin: 0.9rem 0 0;
    color: var(--muted);
  }

  .engineering-document__section h2 {
    margin: 1.25rem 0 0.75rem;
    font-size: 2rem;
  }

  .engineering-document__section h3 {
    margin: 1.25rem 0 0.35rem;
    font-size: 1.35rem;
  }

  .engineering-document__section h4 {
    margin: 1rem 0 0.25rem;
    font-size: 1.1rem;
  }

  .engineering-document__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
    width: min(1040px, calc(100% - 3rem));
    margin: 0 auto;
    padding: 1.5rem 0 2.5rem;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .engineering-document__footer--left,
  .engineering-document__footer--right {
    max-width: 42%;
  }

  .engineering-document__footer p {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
  }

  .engineering-document__footer img {
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    object-fit: contain;
  }

  .engineering-document__section p,
  .engineering-document__section li,
  .engineering-document__section td,
  .engineering-document__section th {
    color: var(--text);
  }

  .engineering-document__section p {
    margin: 0.35rem 0 0.75rem;
  }

  .engineering-document__section ul,
  .engineering-document__section ol {
    margin: 0.35rem 0 0.75rem;
    padding-left: 1.4em;
  }

  .engineering-document__section table {
    width: 100%;
    margin: 0.75rem 0;
    table-layout: auto;
    border-collapse: collapse;
  }

  .engineering-document__section th,
  .engineering-document__section td {
    padding: 0.55rem 0.65rem;
    border: 1px solid var(--border);
    text-align: left;
    vertical-align: top;
  }

  .engineering-document__section th {
    background: rgba(103, 211, 194, 0.14);
    color: var(--accent-strong);
  }

  .engineering-document__signature {
    position: absolute;
    top: 1rem;
    right: 1.25rem;
    z-index: 2;
    color: var(--muted);
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.025em;
  }

  .engineering-document__signature a {
    color: inherit;
    text-decoration: none;
  }

  .engineering-document__signature a:hover,
  .engineering-document__signature a:focus-visible {
    color: var(--text);
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .engineering-document__header,
    .engineering-document__sections {
      width: min(100% - 2rem, 1040px);
    }

    .engineering-document__header {
      padding-top: 2.5rem;
    }
  }

  @media print {
    html,
    body.engineering-document {
      overflow: visible;
    }

    .engineering-document__page {
      min-height: 0;
    }

    .engineering-document__section.engineering-card {
      break-inside: avoid;
    }

    .engineering-footer,
    .engineering-document__signature {
      display: none;
    }
  }
`;
