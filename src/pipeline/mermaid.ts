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

// A subgraph groups nodes inside a labeled container that lays out with its own direction.
type Subgraph = {
  id: string;
  label: string[];
  children: string[];
};

// Absolute geometry for a rendered subgraph container.
type SubgraphBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string[];
  depth: number;
};

// A rectangle-or-shape target that an edge can attach to, either a leaf node or a subgraph box.
type EndpointBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: NodeShape;
};

type BoxSize = { width: number; height: number };

const LINE_HEIGHT = 18;
const NODE_MIN_HEIGHT = 44;
const RANK_GAP = 60;
const NODE_GAP = 32;
const SIDE_PAD = 24;
const TOP_PAD = 24;
const CHAR_WIDTH = 8.2;

const SUBGRAPH_PAD = 18;
const SUBGRAPH_LABEL_TOP = 10;
const SUBGRAPH_LABEL_GAP = 10;

// Sentinel key for the outermost container. It cannot collide with a node or subgraph id
// because parsed ids are restricted to [A-Za-z0-9_-]+.
const ROOT_CONTAINER = '\u0000root';

// Connectors are matched longest-first so that -.-> wins over --> and ---.
const CONNECTORS: Array<{ token: string; style: EdgeStyle; arrow: boolean }> = [
  { token: '-.->', style: 'dotted', arrow: true },
  { token: '==>', style: 'thick', arrow: true },
  { token: '-->', style: 'solid', arrow: true },
  { token: '-.-', style: 'dotted', arrow: false },
  { token: '===', style: 'thick', arrow: false },
  { token: '---', style: 'solid', arrow: false },
];

// Directives that carry no drawable geometry. subgraph, end, and direction are handled
// explicitly before this test so they are not listed here.
const SKIP_LINE = /^(classDef|class|style|linkStyle|click|%%)\b/i;

const round = (value: number): number => Math.round(value * 100) / 100;

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

// Reads a subgraph header such as `subgraph L3[loop]`, `subgraph "Title"`, or `subgraph id`.
function parseSubgraphHeader(rest: string, fallbackIndex: number): { id: string; label: string[] } {
  const trimmed = rest.trim();
  if (!trimmed) {
    return { id: `sub-${fallbackIndex}`, label: [''] };
  }
  const braced = trimmed.match(/^[A-Za-z0-9_-]+\s*[[({]/);
  if (braced) {
    const node = parseNodeToken(trimmed);
    if (node) {
      return { id: node.id, label: node.lines };
    }
  }
  const quoted = trimmed.match(/^"(.*)"$/);
  if (quoted) {
    return { id: trimmed, label: labelLines(quoted[1] ?? '') };
  }
  const bare = trimmed.match(/^([A-Za-z0-9_-]+)\s*$/);
  if (bare) {
    return { id: bare[1] ?? trimmed, label: [bare[1] ?? trimmed] };
  }
  return { id: trimmed, label: labelLines(trimmed) };
}

function determineDirection(header: string): LayoutDirection {
  return /\b(lr|rl)\b/i.test(header) ? 'LR' : 'TD';
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
    const slopedSideWidth = textWidth + (node.lines.length - 1) * LINE_HEIGHT + 16;
    const size = Math.max(120, Math.min(220, Math.max(slopedSideWidth, textHeight * 2 + 28)));
    return {
      width: size,
      height: size,
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
  // Back-edge detection uses the DFS recursion stack to spot a target node that is still active.
  // Those edges are excluded from longest-path rank relaxation so a cycle does not inflate the main-axis rank count.
  // They still remain in the rendered edge list so the loop arrow is drawn.
  const rank = new Map<string, number>();
  for (const id of nodeOrder) {
    rank.set(id, 0);
  }

  const nodeSet = new Set(nodeOrder);
  const adjacency = new Map<string, MermaidEdge[]>();
  for (const edge of edges) {
    if (!nodeSet.has(edge.from)) {
      continue;
    }
    const list = adjacency.get(edge.from) ?? [];
    list.push(edge);
    adjacency.set(edge.from, list);
  }

  const visited = new Set<string>();
  const onStack = new Set<string>();
  const backEdgeKeys = new Set<string>();

  const visit = (id: string): void => {
    visited.add(id);
    onStack.add(id);

    for (const edge of adjacency.get(id) ?? []) {
      const edgeKey = `${edge.from}\u0000${edge.to}`;
      if (onStack.has(edge.to)) {
        backEdgeKeys.add(edgeKey);
        continue;
      }
      if (nodeSet.has(edge.to) && !visited.has(edge.to)) {
        visit(edge.to);
      }
    }

    onStack.delete(id);
  };

  for (const id of nodeOrder) {
    if (!visited.has(id)) {
      visit(id);
    }
  }

  const rankedEdges = edges.filter((edge) => {
    const edgeKey = `${edge.from}\u0000${edge.to}`;
    return !backEdgeKeys.has(edgeKey);
  });

  for (let pass = 0; pass < nodeOrder.length; pass += 1) {
    let changed = false;
    for (const edge of rankedEdges) {
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

// Lays out a set of sized units along a main axis by rank and a cross axis by row order.
// Leaf nodes and subgraph boxes are both units, so subgraphs stack and spread like nodes.
function layoutUnits(
  order: string[],
  sizeOf: (id: string) => BoxSize,
  edges: MermaidEdge[],
  direction: LayoutDirection,
): { placed: Map<string, BoxSize & { x: number; y: number }>; width: number; height: number } {
  const rank = computeRanks(order, edges);

  const rows = new Map<number, string[]>();
  for (const id of order) {
    const r = rank.get(id) ?? 0;
    const row = rows.get(r) ?? [];
    row.push(id);
    rows.set(r, row);
  }
  const maxRank = Math.max(0, ...rank.values());

  const dims = new Map<string, BoxSize>();
  for (const id of order) {
    dims.set(id, sizeOf(id));
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

  const placed = new Map<string, BoxSize & { x: number; y: number }>();
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
      const d = dims.get(id);
      if (!d) {
        continue;
      }
      // Center each unit within its rank band along the main axis.
      const mainCoord = mainCursor + (rankMain - mainExtent(id)) / 2;
      const x = direction === 'LR' ? mainCoord : crossCursor;
      const y = direction === 'LR' ? crossCursor : mainCoord;
      placed.set(id, { x, y, width: d.width, height: d.height });
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

// Walks up the parent chain until the entity that sits directly inside `container`.
// Returns null when `id` is not a descendant of `container`.
function directChild(container: string, id: string, parentOf: Map<string, string>): string | null {
  let cur = id;
  let guard = 0;
  while (guard < 4096) {
    const parent = parentOf.get(cur);
    if (parent === undefined) {
      return null;
    }
    if (parent === container) {
      return cur;
    }
    cur = parent;
    guard += 1;
  }
  return null;
}

function ancestorChain(id: string, parentOf: Map<string, string>): string[] {
  const chain = [id];
  let cur = id;
  let guard = 0;
  while (guard < 4096) {
    const parent = parentOf.get(cur);
    if (parent === undefined) {
      break;
    }
    chain.push(parent);
    cur = parent;
    guard += 1;
  }
  return chain;
}

// The container in which two endpoints first become siblings owns the edge's elbow direction.
function lowestCommonContainer(from: string, to: string, parentOf: Map<string, string>): string {
  const fromChain = ancestorChain(from, parentOf);
  const toSet = new Set(ancestorChain(to, parentOf));
  for (const entry of fromChain) {
    if (toSet.has(entry)) {
      return entry;
    }
  }
  return ROOT_CONTAINER;
}

type ContainerLayout = {
  leaves: Map<string, PlacedNode>;
  subs: Map<string, SubgraphBox>;
  width: number;
  height: number;
};

// Lays out one container and every subgraph nested inside it, returning absolute geometry
// relative to the container origin. Each subgraph is laid out first, then treated as a single
// sized unit in its parent so the whole box stacks and spreads like a node.
function layoutContainer(
  container: string,
  childrenOf: Map<string, string[]>,
  subgraphs: Map<string, Subgraph>,
  nodes: Map<string, MermaidNode>,
  parentOf: Map<string, string>,
  edges: MermaidEdge[],
  directionOf: Map<string, LayoutDirection>,
): ContainerLayout {
  const children = childrenOf.get(container) ?? [];
  const direction = directionOf.get(container) ?? 'TD';

  const innerByChild = new Map<string, ContainerLayout>();
  const labelHeightOf = new Map<string, number>();
  const boxSize = new Map<string, BoxSize>();

  for (const child of children) {
    if (subgraphs.has(child)) {
      const inner = layoutContainer(child, childrenOf, subgraphs, nodes, parentOf, edges, directionOf);
      const sub = subgraphs.get(child);
      const labelLineCount = Math.max(1, sub?.label.length ?? 1);
      const labelHeight = SUBGRAPH_LABEL_TOP + labelLineCount * LINE_HEIGHT + SUBGRAPH_LABEL_GAP;
      innerByChild.set(child, inner);
      labelHeightOf.set(child, labelHeight);
      boxSize.set(child, {
        width: inner.width + SUBGRAPH_PAD * 2,
        height: inner.height + labelHeight + SUBGRAPH_PAD * 2,
      });
    } else {
      const node = nodes.get(child);
      boxSize.set(child, node ? measureNode(node) : { width: 0, height: 0 });
    }
  }

  const unitEdges: MermaidEdge[] = [];
  for (const edge of edges) {
    const from = directChild(container, edge.from, parentOf);
    const to = directChild(container, edge.to, parentOf);
    if (from && to && from !== to) {
      unitEdges.push({ ...edge, from, to });
    }
  }

  const { placed, width, height } = layoutUnits(
    children,
    (id) => boxSize.get(id) ?? { width: 0, height: 0 },
    unitEdges,
    direction,
  );

  const leaves = new Map<string, PlacedNode>();
  const subs = new Map<string, SubgraphBox>();

  for (const child of children) {
    const box = placed.get(child);
    if (!box) {
      continue;
    }
    if (subgraphs.has(child)) {
      const sub = subgraphs.get(child);
      const labelHeight = labelHeightOf.get(child) ?? 0;
      subs.set(child, {
        id: child,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        label: sub?.label ?? [''],
        depth: 0,
      });
      const inner = innerByChild.get(child);
      if (inner) {
        const dx = box.x + SUBGRAPH_PAD;
        const dy = box.y + labelHeight + SUBGRAPH_PAD;
        for (const [id, leaf] of inner.leaves) {
          leaves.set(id, { ...leaf, x: leaf.x + dx, y: leaf.y + dy });
        }
        for (const [id, innerSub] of inner.subs) {
          subs.set(id, { ...innerSub, x: innerSub.x + dx, y: innerSub.y + dy, depth: innerSub.depth + 1 });
        }
      }
    } else {
      const node = nodes.get(child);
      if (node) {
        leaves.set(child, { node, x: box.x, y: box.y, width: box.width, height: box.height });
      }
    }
  }

  return { leaves, subs, width, height };
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

function subgraphMarkup(box: SubgraphBox): string {
  const rect = `<rect class="mermaid-subgraph" x="${round(box.x)}" y="${round(box.y)}" width="${round(box.width)}" height="${round(box.height)}" rx="12" ry="12" />`;
  const labelLinesToDraw = box.label.filter((line) => line.length > 0);
  if (labelLinesToDraw.length === 0) {
    return `
        <g class="mermaid-subgraph-group">
          ${rect}
        </g>`;
  }
  const cx = round(box.x + box.width / 2);
  const baseY = box.y + SUBGRAPH_LABEL_TOP + LINE_HEIGHT;
  const tspans = labelLinesToDraw
    .map((line, index) => `<tspan x="${cx}" y="${round(baseY + index * LINE_HEIGHT)}">${escapeHtml(line)}</tspan>`)
    .join('');
  const label = `<text class="mermaid-subgraph-label" text-anchor="middle" dominant-baseline="middle">${tspans}</text>`;
  return `
        <g class="mermaid-subgraph-group">
          ${rect}
          ${label}
        </g>`;
}

function boundaryPoint(box: EndpointBox, towardX: number, towardY: number): { x: number; y: number } {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy };
  }
  const rx = box.width / 2;
  const ry = box.height / 2;
  let scale: number;
  if (box.shape === 'diamond') {
    scale = 1 / (Math.abs(dx) / rx + Math.abs(dy) / ry);
  } else if (box.shape === 'ellipse') {
    scale = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  } else {
    scale = 1 / Math.max(Math.abs(dx) / rx, Math.abs(dy) / ry);
  }
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function anchorPoints(
  from: EndpointBox,
  to: EndpointBox,
  direction: LayoutDirection,
): { x1: number; y1: number; x2: number; y2: number } {
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;

  // Spread exits along the source boundary while keeping arrivals centered on
  // the target's leading edge. This gives decision branches shallow fan-out
  // angles and leaves room for a short square approach into each target.
  const start = boundaryPoint(from, toCx, toCy);
  if (direction === 'LR') {
    const targetX = toCx >= fromCx ? to.x : to.x + to.width;
    return { x1: start.x, y1: start.y, x2: targetX, y2: toCy };
  }
  const targetY = toCy >= fromCy ? to.y : to.y + to.height;
  return { x1: start.x, y1: start.y, x2: toCx, y2: targetY };
}

function edgeMarkupFor(
  edge: MermaidEdge,
  from: EndpointBox,
  to: EndpointBox,
  direction: LayoutDirection,
  markerId: string,
): string {
  const { x1, y1, x2, y2 } = anchorPoints(from, to, direction);
  const dash = edge.style === 'dotted' ? ' stroke-dasharray="6 5"' : '';
  const thick = edge.style === 'thick' ? ' stroke-width="3"' : '';
  const marker = edge.arrow ? ` marker-end="url(#${markerId})"` : '';
  // Follow Obsidian's edge shape: one long straight segment, one compact
  // rounded corner, then a short square approach into the target.
  const dx = x2 - x1;
  const dy = y2 - y1;
  const sx = round(x1);
  const sy = round(y1);
  const tx = round(x2);
  const ty = round(y2);
  let d: string;
  if (direction === 'LR') {
    const approach = Math.sign(dx || 1) * Math.min(18, Math.abs(dx) / 3);
    const cornerX = x2 - approach;
    const lineDx = cornerX - x1;
    const lineDy = y2 - y1;
    const lineLength = Math.hypot(lineDx, lineDy);
    const trim = Math.min(18, lineLength / 3);
    const curveX = cornerX - (lineDx / lineLength) * trim;
    const curveY = y2 - (lineDy / lineLength) * trim;
    d = `M ${sx} ${sy} L ${round(curveX)} ${round(curveY)} Q ${round(cornerX)} ${ty} ${tx} ${ty}`;
  } else {
    const approach = Math.sign(dy || 1) * Math.min(18, Math.abs(dy) / 3);
    const cornerY = y2 - approach;
    const lineDx = x2 - x1;
    const lineDy = cornerY - y1;
    const lineLength = Math.hypot(lineDx, lineDy);
    const trim = Math.min(18, lineLength / 3);
    const curveX = x2 - (lineDx / lineLength) * trim;
    const curveY = cornerY - (lineDy / lineLength) * trim;
    d = `M ${sx} ${sy} L ${round(curveX)} ${round(curveY)} Q ${tx} ${round(cornerY)} ${tx} ${ty}`;
  }
  const path = `<path class="mermaid-edge" d="${d}"${dash}${thick}${marker} />`;
  if (!edge.label) {
    return path;
  }
  const mx = direction === 'LR' ? round(x2 - Math.sign(dx || 1) * 30) : tx;
  const my = direction === 'LR' ? ty : round(y2 - Math.sign(dy || 1) * 30);
  const labelWidth = edge.label.length * 6.5 + 10;
  const bg = `<rect class="mermaid-edge-label-bg" x="${mx - labelWidth / 2}" y="${my - 9}" width="${labelWidth}" height="18" rx="4" ry="4" />`;
  const labelText = `<text class="mermaid-edge-label" x="${mx}" y="${my + 1}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(edge.label)}</text>`;
  return `${path}${bg}${labelText}`;
}

function renderSvg(
  normalized: string,
  width: number,
  height: number,
  leaves: PlacedNode[],
  subBoxes: SubgraphBox[],
  edges: MermaidEdge[],
  boxOf: (id: string) => EndpointBox | undefined,
  directionOfEdge: (edge: MermaidEdge) => LayoutDirection,
): string {
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 12);
  const markerId = `mermaid-${hash}-arrow`;

  const subMarkup = subBoxes.map((box) => subgraphMarkup(box)).join('');
  const edgeMarkup = edges
    .map((edge) => {
      const from = boxOf(edge.from);
      const to = boxOf(edge.to);
      if (!from || !to) {
        return '';
      }
      return edgeMarkupFor(edge, from, to, directionOfEdge(edge), markerId);
    })
    .join('');
  const markup = leaves.map((leaf) => nodeMarkup(leaf)).join('');
  const containerLayer = subBoxes.length > 0 ? `${subMarkup}\n      ` : '';

  return `
    <svg class="engineering-mermaid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mermaid diagram">
      <defs>
        <marker id="${markerId}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
          <path class="mermaid-arrowhead" d="M 0.5 0.5 L 8.5 4.5 L 0.5 8.5 z" />
        </marker>
      </defs>
      ${containerLayer}${edgeMarkup}
      ${markup}
    </svg>
  `;
}

export function renderMermaidBlock(content: string): string {
  const normalized = content.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    return '<pre><code></code></pre>';
  }

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const header = lines[0] ?? '';
  const rootDirection = determineDirection(header);

  const nodes = new Map<string, MermaidNode>();
  const nodeOrder: string[] = [];
  const edges: MermaidEdge[] = [];
  const subgraphs = new Map<string, Subgraph>();
  const parentOf = new Map<string, string>();
  const childrenOf = new Map<string, string[]>();
  const directionOf = new Map<string, LayoutDirection>();
  directionOf.set(ROOT_CONTAINER, rootDirection);

  const stack: string[] = [];
  const currentContainer = (): string => stack[stack.length - 1] ?? ROOT_CONTAINER;
  const childList = (container: string): string[] => {
    const existing = childrenOf.get(container);
    if (existing) {
      return existing;
    }
    const created: string[] = [];
    childrenOf.set(container, created);
    return created;
  };

  const addNode = (candidate: MermaidNode | null) => {
    if (!candidate) {
      return;
    }
    // An edge endpoint that names a subgraph references the whole box, not a leaf node.
    if (subgraphs.has(candidate.id)) {
      return;
    }
    const existing = nodes.get(candidate.id);
    if (!existing) {
      nodes.set(candidate.id, candidate);
      nodeOrder.push(candidate.id);
      parentOf.set(candidate.id, currentContainer());
      childList(currentContainer()).push(candidate.id);
      return;
    }
    // A later definition with a real label upgrades a bare-id placeholder.
    if (joinLines(existing) === existing.id && joinLines(candidate) !== candidate.id) {
      existing.lines = candidate.lines;
      existing.shape = candidate.shape;
    }
  };

  // Splits a body line into node segments separated by connectors, so a chained
  // edge such as `A --> B --> C` yields both A->B and B->C instead of collapsing.
  const parseEdgeLine = (line: string): boolean => {
    const masked = maskLabels(line);
    const hits: Array<{ index: number; end: number; style: EdgeStyle; arrow: boolean }> = [];
    let cursor = 0;
    while (cursor < masked.length) {
      let matched: { token: string; style: EdgeStyle; arrow: boolean } | null = null;
      for (const connector of CONNECTORS) {
        if (masked.startsWith(connector.token, cursor)) {
          matched = connector;
          break;
        }
      }
      if (matched) {
        hits.push({ index: cursor, end: cursor + matched.token.length, style: matched.style, arrow: matched.arrow });
        cursor += matched.token.length;
      } else {
        cursor += 1;
      }
    }
    if (hits.length === 0) {
      return false;
    }

    const segments: string[] = [];
    segments.push(line.slice(0, hits[0]?.index ?? 0));
    for (let i = 0; i < hits.length; i += 1) {
      const start = hits[i]?.end ?? 0;
      const end = i + 1 < hits.length ? hits[i + 1]?.index ?? line.length : line.length;
      segments.push(line.slice(start, end));
    }

    const parsedNodes: Array<{ node: MermaidNode; label: string }> = [];
    const firstNode = parseNodeToken(segments[0] ?? '');
    if (!firstNode) {
      return false;
    }
    parsedNodes.push({ node: firstNode, label: '' });
    for (let i = 1; i < segments.length; i += 1) {
      let raw = (segments[i] ?? '').trim();
      let edgeLabel = '';
      const pipeMatch = raw.match(/^\|([^|]*)\|\s*/);
      if (pipeMatch) {
        edgeLabel = cleanText(pipeMatch[1] ?? '');
        raw = raw.slice(pipeMatch[0].length).trim();
      }
      const node = parseNodeToken(raw);
      if (!node) {
        break;
      }
      parsedNodes.push({ node, label: edgeLabel });
    }

    if (parsedNodes.length < 2) {
      return false;
    }

    for (let i = 0; i < parsedNodes.length; i += 1) {
      addNode(parsedNodes[i]?.node ?? null);
    }
    for (let i = 0; i + 1 < parsedNodes.length; i += 1) {
      const hit = hits[i];
      const from = parsedNodes[i]?.node;
      const to = parsedNodes[i + 1]?.node;
      if (hit && from && to) {
        edges.push({ from: from.id, to: to.id, label: parsedNodes[i + 1]?.label ?? '', style: hit.style, arrow: hit.arrow });
      }
    }
    return true;
  };

  let anonymousSubgraphs = 0;
  const bodyStart = /^(flowchart|graph)\b/i.test(header) ? 1 : 0;
  for (const line of lines.slice(bodyStart)) {
    const subgraphOpen = line.match(/^subgraph\b\s*(.*)$/i);
    if (subgraphOpen) {
      const parent = currentContainer();
      const header = parseSubgraphHeader(subgraphOpen[1] ?? '', anonymousSubgraphs);
      anonymousSubgraphs += 1;
      let id = header.id;
      if (nodes.has(id) || subgraphs.has(id)) {
        id = `${id}-sub-${anonymousSubgraphs}`;
      }
      subgraphs.set(id, { id, label: header.label, children: [] });
      parentOf.set(id, parent);
      childList(parent).push(id);
      directionOf.set(id, directionOf.get(parent) ?? rootDirection);
      stack.push(id);
      continue;
    }
    if (/^end$/i.test(line)) {
      stack.pop();
      continue;
    }
    const directionLine = line.match(/^direction\s+(TB|TD|BT|LR|RL)\b/i);
    if (directionLine) {
      const value: LayoutDirection = /LR|RL/i.test(directionLine[1] ?? '') ? 'LR' : 'TD';
      directionOf.set(currentContainer(), value);
      continue;
    }
    if (SKIP_LINE.test(line) || /^(flowchart|graph)\b/i.test(line)) {
      continue;
    }

    if (parseEdgeLine(line)) {
      continue;
    }

    addNode(parseNodeToken(line));
  }

  if (nodeOrder.length === 0 && subgraphs.size === 0) {
    return '<pre><code></code></pre>';
  }

  if (subgraphs.size === 0) {
    const { placed, width, height } = layoutUnits(
      nodeOrder,
      (id) => {
        const node = nodes.get(id);
        return node ? measureNode(node) : { width: 0, height: 0 };
      },
      edges,
      rootDirection,
    );
    const leaves: PlacedNode[] = [];
    for (const id of nodeOrder) {
      const box = placed.get(id);
      const node = nodes.get(id);
      if (box && node) {
        leaves.push({ node, x: box.x, y: box.y, width: box.width, height: box.height });
      }
    }
    const boxOf = (id: string): EndpointBox | undefined => {
      const box = placed.get(id);
      const node = nodes.get(id);
      if (!box || !node) {
        return undefined;
      }
      return { x: box.x, y: box.y, width: box.width, height: box.height, shape: node.shape };
    };
    return renderSvg(normalized, width, height, leaves, [], edges, boxOf, () => rootDirection);
  }

  const root = layoutContainer(ROOT_CONTAINER, childrenOf, subgraphs, nodes, parentOf, edges, directionOf);
  const orderedLeaves: PlacedNode[] = [];
  for (const id of nodeOrder) {
    const leaf = root.leaves.get(id);
    if (leaf) {
      orderedLeaves.push(leaf);
    }
  }
  const subBoxes = [...root.subs.values()].sort((a, b) => a.depth - b.depth);
  const boxOf = (id: string): EndpointBox | undefined => {
    const leaf = root.leaves.get(id);
    if (leaf) {
      return { x: leaf.x, y: leaf.y, width: leaf.width, height: leaf.height, shape: leaf.node.shape };
    }
    const sub = root.subs.get(id);
    if (sub) {
      return { x: sub.x, y: sub.y, width: sub.width, height: sub.height, shape: 'rect' };
    }
    return undefined;
  };
  const directionOfEdge = (edge: MermaidEdge): LayoutDirection =>
    directionOf.get(lowestCommonContainer(edge.from, edge.to, parentOf)) ?? rootDirection;

  return renderSvg(normalized, root.width, root.height, orderedLeaves, subBoxes, edges, boxOf, directionOfEdge);
}
