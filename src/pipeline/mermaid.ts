import { createHash } from 'node:crypto';

type NodeShape = 'rect' | 'diamond' | 'ellipse';

type MermaidNode = {
  id: string;
  lines: string[];
  shape: NodeShape;
};

type EdgeStyle = 'solid' | 'dotted' | 'thick';

type MermaidEdge = {
  from: string;
  to: string;
  label: string;
  style: EdgeStyle;
  arrow: boolean;
};

type LayoutDirection = 'TD' | 'LR';

type PlacedNode = {
  node: MermaidNode;
  x: number;
  y: number;
  width: number;
  height: number;
};

const LINE_HEIGHT = 18;
const NODE_MIN_HEIGHT = 44;
const RANK_GAP = 60;
const NODE_GAP = 32;
const SIDE_PAD = 24;
const TOP_PAD = 24;
const CHAR_WIDTH = 8.2;

// Connectors are matched longest-first so that -.-> wins over --> and ---.
const CONNECTORS: Array<{ token: string; style: EdgeStyle; arrow: boolean }> = [
  { token: '-.->', style: 'dotted', arrow: true },
  { token: '==>', style: 'thick', arrow: true },
  { token: '-->', style: 'solid', arrow: true },
  { token: '-.-', style: 'dotted', arrow: false },
  { token: '===', style: 'thick', arrow: false },
  { token: '---', style: 'solid', arrow: false },
];

const SKIP_LINE = /^(classDef|class|style|linkStyle|click|subgraph|end|direction|%%)\b/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Splits a raw label into display lines, honoring <br> as a hard line break so
// that a diamond stays compact instead of stretching into one long line.
function labelLines(value: string): string[] {
  const lines = value
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((line) => line.replace(/^["'`]|["'`]$/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [''];
}

function cleanText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinLines(node: MermaidNode): string {
  return node.lines.join(' ');
}

// Replaces the interior of every bracketed label with filler of equal length so
// that a connector token inside a label cannot be mistaken for an edge.
function maskLabels(line: string): string {
  return line.replace(/(\[\[|\(\(|\(\[|\{\{|\[|\(|\{)([^\]})]*)(\]\]|\)\)|\]\)|\}\}|\]|\)|\})/g, (match) =>
    '\u0000'.repeat(match.length),
  );
}

function parseNodeToken(token: string): MermaidNode | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const head = trimmed.match(/^([A-Za-z0-9_-]+)\s*/);
  if (!head) {
    return null;
  }
  const id = head[1] ?? '';
  const rest = trimmed.slice(head[0].length).trim();

  if (!rest) {
    return { id, lines: [id], shape: 'rect' };
  }

  const shapes: Array<{ open: string; close: string; shape: NodeShape }> = [
    { open: '((', close: '))', shape: 'ellipse' },
    { open: '([', close: '])', shape: 'rect' },
    { open: '[[', close: ']]', shape: 'rect' },
    { open: '{{', close: '}}', shape: 'rect' },
    { open: '{', close: '}', shape: 'diamond' },
    { open: '[', close: ']', shape: 'rect' },
    { open: '(', close: ')', shape: 'rect' },
    { open: '>', close: ']', shape: 'rect' },
  ];

  for (const { open, close, shape } of shapes) {
    if (rest.startsWith(open) && rest.endsWith(close) && rest.length >= open.length + close.length) {
      const inner = rest.slice(open.length, rest.length - close.length);
      const lines = labelLines(inner);
      return { id, lines: lines[0] === '' && lines.length === 1 ? [id] : lines, shape };
    }
  }

  const lines = labelLines(rest);
  return { id, lines: lines[0] === '' && lines.length === 1 ? [id] : lines, shape: 'rect' };
}

function determineDirection(header: string): LayoutDirection {
  return /\b(lr|rl)\b/i.test(header) ? 'LR' : 'TD';
}

function splitEdge(
  masked: string,
): { leftEnd: number; rightStart: number; style: EdgeStyle; arrow: boolean } | null {
  let best: { index: number; token: string; style: EdgeStyle; arrow: boolean } | null = null;
  for (const connector of CONNECTORS) {
    const index = masked.indexOf(connector.token);
    if (index !== -1 && (best === null || index < best.index)) {
      best = { index, token: connector.token, style: connector.style, arrow: connector.arrow };
    }
  }
  if (!best) {
    return null;
  }
  return {
    leftEnd: best.index,
    rightStart: best.index + best.token.length,
    style: best.style,
    arrow: best.arrow,
  };
}

function longestLine(lines: string[]): number {
  return lines.reduce((max, line) => Math.max(max, line.length), 0);
}

// Sizes a node so its label fits. Diamonds need extra room because text sits in
// the inscribed rectangle, which is roughly half the diamond's span.
function measureNode(node: MermaidNode): { width: number; height: number } {
  const textWidth = longestLine(node.lines) * CHAR_WIDTH;
  const textHeight = node.lines.length * LINE_HEIGHT;

  if (node.shape === 'diamond') {
    return {
      width: Math.max(120, Math.min(300, textWidth * 1.5 + 40)),
      height: Math.max(72, textHeight * 2 + 28),
    };
  }
  if (node.shape === 'ellipse') {
    return {
      width: Math.max(96, Math.min(260, textWidth * 1.35 + 32)),
      height: Math.max(56, textHeight + 30),
    };
  }
  return {
    width: Math.max(96, Math.min(260, textWidth + 32)),
    height: Math.max(NODE_MIN_HEIGHT, textHeight + 22),
  };
}

function computeRanks(nodeOrder: string[], edges: MermaidEdge[]): Map<string, number> {
  const rank = new Map<string, number>();
  for (const id of nodeOrder) {
    rank.set(id, 0);
  }
  // Longest-path ranking. The pass count is bounded by node count so a cyclic
  // graph settles instead of looping forever.
  for (let pass = 0; pass < nodeOrder.length; pass += 1) {
    let changed = false;
    for (const edge of edges) {
      const fromRank = rank.get(edge.from) ?? 0;
      const toRank = rank.get(edge.to) ?? 0;
      if (toRank < fromRank + 1) {
        rank.set(edge.to, fromRank + 1);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return rank;
}

function layoutNodes(
  nodeOrder: string[],
  nodes: Map<string, MermaidNode>,
  edges: MermaidEdge[],
  direction: LayoutDirection,
): { placed: Map<string, PlacedNode>; width: number; height: number } {
  const rank = computeRanks(nodeOrder, edges);

  const rows = new Map<number, string[]>();
  for (const id of nodeOrder) {
    const r = rank.get(id) ?? 0;
    const row = rows.get(r) ?? [];
    row.push(id);
    rows.set(r, row);
  }
  const maxRank = Math.max(0, ...rank.values());

  const dims = new Map<string, { width: number; height: number }>();
  for (const id of nodeOrder) {
    const node = nodes.get(id);
    if (node) {
      dims.set(id, measureNode(node));
    }
  }

  const mainExtent = (id: string): number => {
    const d = dims.get(id);
    if (!d) {
      return 0;
    }
    return direction === 'LR' ? d.width : d.height;
  };
  const crossExtent = (id: string): number => {
    const d = dims.get(id);
    if (!d) {
      return 0;
    }
    return direction === 'LR' ? d.height : d.width;
  };

  let maxCross = 0;
  for (let r = 0; r <= maxRank; r += 1) {
    const row = rows.get(r) ?? [];
    let total = 0;
    for (const id of row) {
      total += crossExtent(id) + NODE_GAP;
    }
    maxCross = Math.max(maxCross, Math.max(0, total - NODE_GAP));
  }

  const placed = new Map<string, PlacedNode>();
  let mainCursor = TOP_PAD;
  for (let r = 0; r <= maxRank; r += 1) {
    const row = rows.get(r) ?? [];
    let rankMain = 0;
    let rowCross = 0;
    for (const id of row) {
      rankMain = Math.max(rankMain, mainExtent(id));
      rowCross += crossExtent(id) + NODE_GAP;
    }
    rowCross = Math.max(0, rowCross - NODE_GAP);

    let crossCursor = SIDE_PAD + (maxCross - rowCross) / 2;
    for (const id of row) {
      const node = nodes.get(id);
      const d = dims.get(id);
      if (!node || !d) {
        continue;
      }
      // Center each node within its rank band along the main axis.
      const mainCoord = mainCursor + (rankMain - mainExtent(id)) / 2;
      const x = direction === 'LR' ? mainCoord : crossCursor;
      const y = direction === 'LR' ? crossCursor : mainCoord;
      placed.set(id, { node, x, y, width: d.width, height: d.height });
      crossCursor += crossExtent(id) + NODE_GAP;
    }
    mainCursor += rankMain + RANK_GAP;
  }

  const mainSize = mainCursor - RANK_GAP + TOP_PAD;
  const crossSize = maxCross + SIDE_PAD * 2;
  const width = direction === 'LR' ? mainSize : crossSize;
  const height = direction === 'LR' ? crossSize : mainSize;
  return { placed, width, height };
}

function nodeText(lines: string[], cx: number, cy: number): string {
  const startY = cy - ((lines.length - 1) * LINE_HEIGHT) / 2;
  const tspans = lines
    .map((line, index) => `<tspan x="${cx}" y="${startY + index * LINE_HEIGHT + 1}">${escapeHtml(line)}</tspan>`)
    .join('');
  return `<text class="mermaid-node-text" text-anchor="middle" dominant-baseline="middle">${tspans}</text>`;
}

function nodeMarkup(placed: PlacedNode): string {
  const { node, x, y, width, height } = placed;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const text = nodeText(node.lines, cx, cy);

  let shapeMarkup: string;
  if (node.shape === 'diamond') {
    const points = `${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}`;
    shapeMarkup = `<polygon class="mermaid-node mermaid-node--diamond" points="${points}" />`;
  } else if (node.shape === 'ellipse') {
    shapeMarkup = `<ellipse class="mermaid-node mermaid-node--ellipse" cx="${cx}" cy="${cy}" rx="${width / 2}" ry="${height / 2}" />`;
  } else {
    shapeMarkup = `<rect class="mermaid-node mermaid-node--rect" x="${x}" y="${y}" width="${width}" height="${height}" rx="12" ry="12" />`;
  }

  return `
        <g class="mermaid-node-group">
          ${shapeMarkup}
          ${text}
        </g>`;
}

function anchorPoints(
  from: PlacedNode,
  to: PlacedNode,
  direction: LayoutDirection,
): { x1: number; y1: number; x2: number; y2: number } {
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;

  if (direction === 'LR' && to.x >= from.x + from.width) {
    return { x1: from.x + from.width, y1: fromCy, x2: to.x, y2: toCy };
  }
  if (direction === 'TD' && to.y >= from.y + from.height) {
    return { x1: fromCx, y1: from.y + from.height, x2: toCx, y2: to.y };
  }
  return { x1: fromCx, y1: fromCy, x2: toCx, y2: toCy };
}

export function renderMermaidBlock(content: string): string {
  const normalized = content.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    return '<pre><code></code></pre>';
  }

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const header = lines[0] ?? '';
  const direction = determineDirection(header);

  const nodes = new Map<string, MermaidNode>();
  const nodeOrder: string[] = [];
  const edges: MermaidEdge[] = [];

  const addNode = (candidate: MermaidNode | null) => {
    if (!candidate) {
      return;
    }
    const existing = nodes.get(candidate.id);
    if (!existing) {
      nodes.set(candidate.id, candidate);
      nodeOrder.push(candidate.id);
      return;
    }
    // A later definition with a real label upgrades a bare-id placeholder.
    if (joinLines(existing) === existing.id && joinLines(candidate) !== candidate.id) {
      existing.lines = candidate.lines;
      existing.shape = candidate.shape;
    }
  };

  const bodyStart = /^(flowchart|graph)\b/i.test(header) ? 1 : 0;
  for (const line of lines.slice(bodyStart)) {
    if (SKIP_LINE.test(line) || /^(flowchart|graph)\b/i.test(line)) {
      continue;
    }

    const masked = maskLabels(line);
    const split = splitEdge(masked);
    if (split) {
      const leftRaw = line.slice(0, split.leftEnd);
      let rightRaw = line.slice(split.rightStart).trim();
      let edgeLabel = '';
      const pipeMatch = rightRaw.match(/^\|([^|]*)\|\s*/);
      if (pipeMatch) {
        edgeLabel = cleanText(pipeMatch[1] ?? '');
        rightRaw = rightRaw.slice(pipeMatch[0].length).trim();
      }
      const from = parseNodeToken(leftRaw);
      const to = parseNodeToken(rightRaw);
      if (from && to) {
        addNode(from);
        addNode(to);
        edges.push({ from: from.id, to: to.id, label: edgeLabel, style: split.style, arrow: split.arrow });
        continue;
      }
    }

    addNode(parseNodeToken(line));
  }

  if (nodeOrder.length === 0) {
    return '<pre><code></code></pre>';
  }

  const { placed, width, height } = layoutNodes(nodeOrder, nodes, edges, direction);
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 12);
  const renderId = `mermaid-${hash}`;
  const markerId = `${renderId}-arrow`;

  const edgeMarkup = edges
    .map((edge) => {
      const from = placed.get(edge.from);
      const to = placed.get(edge.to);
      if (!from || !to) {
        return '';
      }
      const { x1, y1, x2, y2 } = anchorPoints(from, to, direction);
      const dash = edge.style === 'dotted' ? ' stroke-dasharray="6 5"' : '';
      const thick = edge.style === 'thick' ? ' stroke-width="3"' : '';
      const marker = edge.arrow ? ` marker-end="url(#${markerId})"` : '';
      // Bow each edge with a single quadratic control point so connectors read as
      // gentle curves instead of hard polylines. The offset is a capped fraction of
      // the edge length, kept deterministic so repeated builds hash identically.
      const round = (value: number): number => Math.round(value * 100) / 100;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy);
      const bow = length === 0 ? 0 : Math.min(length * 0.09, 24);
      const perpX = length === 0 ? 0 : -dy / length;
      const perpY = length === 0 ? 0 : dx / length;
      const cx = round(x1 + dx / 2 + perpX * bow);
      const cy = round(y1 + dy / 2 + perpY * bow);
      const path = `<path class="mermaid-edge" d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}"${dash}${thick}${marker} />`;
      if (!edge.label) {
        return path;
      }
      const mx = round((x1 + x2) / 2 + perpX * bow * 0.5);
      const my = round((y1 + y2) / 2 + perpY * bow * 0.5);
      const labelWidth = edge.label.length * 6.5 + 10;
      const bg = `<rect class="mermaid-edge-label-bg" x="${mx - labelWidth / 2}" y="${my - 9}" width="${labelWidth}" height="18" rx="4" ry="4" />`;
      const labelText = `<text class="mermaid-edge-label" x="${mx}" y="${my + 1}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(edge.label)}</text>`;
      return `${path}${bg}${labelText}`;
    })
    .join('');

  const markup = nodeOrder
    .map((id) => placed.get(id))
    .filter((entry): entry is PlacedNode => Boolean(entry))
    .map((entry) => nodeMarkup(entry))
    .join('');

  return `
    <svg class="engineering-mermaid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mermaid diagram">
      <defs>
        <marker id="${markerId}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
          <path class="mermaid-arrowhead" d="M 0.5 0.5 L 8.5 4.5 L 0.5 8.5 z" />
        </marker>
      </defs>
      ${edgeMarkup}
      ${markup}
    </svg>
  `;
}
