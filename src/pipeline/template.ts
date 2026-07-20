export interface TemplateStep {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scale?: number;
  readonly rotate?: number;
  readonly content: string;
  readonly className?: string;
  readonly style?: string;
}

export interface TemplateOptions {
  readonly title: string;
  readonly bodyClass: string;
  readonly viewport: string;
  readonly css: string;
  readonly scenery: string;
  readonly impressAttributes: Readonly<Record<string, string | number>>;
  readonly steps: readonly TemplateStep[];
  readonly impressScript: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderTemplate(options: TemplateOptions): string {
  const stepMarkup = options.steps
    .map((step) => {
      const classNames = ["step", step.className ?? ""].filter(Boolean).join(" ");
      const attributes = [
        `data-x="${step.x}"`,
        `data-y="${step.y}"`,
        `data-z="${step.z}"`,
        `data-id="${escapeHtml(step.id)}"`,
      ];

      if (step.style) {
        attributes.push(`style="${escapeHtml(step.style)}"`);
      }
      if (typeof step.scale === "number" && step.scale !== 1) {
        attributes.push(`data-scale="${step.scale}"`);
      }
      if (typeof step.rotate === "number" && step.rotate !== 0) {
        attributes.push(`data-rotate="${step.rotate}"`);
      }

      return `      <div class="${classNames}" ${attributes.join(" ")}>${step.content}</div>`;
    })
    .join("\n");
  const impressAttributes = Object.entries(options.impressAttributes)
    .map(([name, value]) => ` data-${escapeHtml(name)}="${escapeHtml(String(value))}"`)
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="${escapeHtml(options.viewport)}" />
    <title>${escapeHtml(options.title)}</title>
    <style>
${options.css}
    </style>
  </head>
  <body class="${escapeHtml(options.bodyClass)}">
    <div id="impress"${impressAttributes}>
${options.scenery.trim()}
${stepMarkup}
    </div>
<script>${options.impressScript}</script>
<script>if (typeof window.impress === 'function') { window.impress().init(); }</script>
  </body>
</html>
`;
}
