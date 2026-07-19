import { createHash } from 'node:crypto';

type MermaidNode = {
  id: string;
  label: string;
  order: number;
};

type MermaidEdge = {
  from: string;
  to: string;
};

type LayoutDirection = 'TD' | 'LR';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseNodeToken(token: string): { id: string; label: string } {
  const trimmed = token.trim();
  const labelMatch = trimmed.match(/^([A-Za-z0-9_-]+)(?:\s*\[(.*?)\])?$/);
  if (labelMatch) {
    return {
      id: labelMatch[1],
      label: labelMatch[2] ?? labelMatch[1],
    };
  }

  const parenthesisMatch = trimmed.match(/^([A-Za-z0-9_-]+)(?:\s*\((.*?)\))?$/);
  if (parenthesisMatch) {
    return {
      id: parenthesisMatch[1],
      label: parenthesisMatch[2] ?? parenthesisMatch[1],
    };
  }

  return { id: trimmed, label: trimmed };
}

function determineDirection(lines: string[]): LayoutDirection {
  const header = lines[0] ?? '';
  const normalized = header.toLowerCase();
  if (normalized.includes('lr')) {
    return 'LR';
  }
  return 'TD';
}

function createNodeLayout(nodes: MermaidNode[], direction: LayoutDirection): Array<{ node: MermaidNode; x: number; y: number; width: number; height: number }> {
  const baseSpacing = direction === 'LR' ? 190 : 120;
  const nodeHeight = 48;
  const labelPadding = 24;

  return nodes.map((node, index) => {
    const width = Math.max(92, Math.min(220, node.label.length * 9 + labelPadding));
    const x = direction === 'LR' ? 40 + index * baseSpacing : 40;
    const y = direction === 'LR' ? 40 : 40 + index * baseSpacing;
    return { node, x, y, width, height: nodeHeight };
  });
}

export function renderMermaidBlock(content: string): string {
  const normalized = content.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    return '<pre><code></code></pre>';
  }

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const direction = determineDirection(lines);
  const nodes = new Map<string, MermaidNode>();
  const nodeOrder: string[] = [];
  const edges: MermaidEdge[] = [];
  const addNode = (id: string, label: string) => {
    if (!nodes.has(id)) {
      const node: MermaidNode = { id, label, order: nodeOrder.length };
      nodes.set(id, node);
      nodeOrder.push(id);
    }
  };

  for (const line of lines.slice(1)) {
    if (/^(flowchart|graph)\b/i.test(line) || /^subgraph\b/i.test(line)) {
      continue;
    }

    const edgeParts = line.split('-->');
    if (edgeParts.length === 2) {
      const from = parseNodeToken(edgeParts[0] ?? '');
      const to = parseNodeToken(edgeParts[1] ?? '');
      addNode(from.id, from.label);
      addNode(to.id, to.label);
      edges.push({ from: from.id, to: to.id });
      continue;
    }

    const node = parseNodeToken(line);
    addNode(node.id, node.label);
  }

  const orderedNodes = nodeOrder.map((id) => nodes.get(id) as MermaidNode);
  const layout = createNodeLayout(orderedNodes, direction);
  const nodeById = new Map(layout.map((entry) => [entry.node.id, entry]));
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 12);
  const renderId = `mermaid-${hash}`;
  const svgWidth = direction === 'LR' ? 80 + orderedNodes.length * 190 : 220;
  const svgHeight = direction === 'LR' ? 140 : 100 + orderedNodes.length * 120;
  const markerId = `${renderId}-arrow`;

  const edgeMarkup = edges
    .map((edge) => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      if (!from || !to) {
        return '';
      }

      const x1 = from.x + from.width / 2;
      const y1 = from.y + from.height / 2;
      const x2 = to.x + to.width / 2;
      const y2 = to.y + to.height / 2;
      return `<path class="mermaid-edge" d="M ${x1} ${y1} L ${x2} ${y2}" marker-end="url(#${markerId})" />`;
    })
    .join('');

  const nodeMarkup = layout
    .map(({ node, x, y, width, height }) => {
      const label = escapeHtml(node.label);
      return `
        <g class="mermaid-node-group">
          <rect class="mermaid-node" x="${x}" y="${y}" width="${width}" height="${height}" rx="14" ry="14" />
          <text class="mermaid-node-text" x="${x + width / 2}" y="${y + height / 2 + 1}" text-anchor="middle" dominant-baseline="middle">${label}</text>
        </g>`;
    })
    .join('');

  return `
    <svg class="engineering-mermaid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="Mermaid diagram">
      <defs>
        <marker id="${markerId}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path class="mermaid-edge" d="M 0 0 L 8 4 L 0 8 z" />
        </marker>
      </defs>
      ${edgeMarkup}
      ${nodeMarkup}
    </svg>
  `;
}
