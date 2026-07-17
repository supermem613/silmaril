export interface CanvasAttrs {
  width?: number;
  height?: number;
}

export interface SceneAttrs {
  title?: string;
  theme?: string;
  canvas?: CanvasAttrs;
}

export interface SceneRegionIR {
  id: string;
  title: string;
  attrs: Record<string, unknown>;
  body: string;
  groupId: string | null;
  children: SceneRegionIR[];
}

export interface SceneIR {
  id: string;
  rawMarkdown: string;
  attrs: SceneAttrs;
  groupId: string | null;
  theme: string | null;
  canvas: CanvasAttrs | null;
  regions: SceneRegionIR[];
  html?: never;
}

export interface LayoutStep {
  id: string;
  title: string;
  groupId: string | null;
}

export interface LayoutPatch {
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
}

export interface LayoutPlacement {
  id: string;
  title: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  groupId: string | null;
}

export interface LayoutGroup {
  id: string;
  title: string;
  steps: LayoutPlacement[];
}

export interface LayoutGrid {
  columns: number;
  gap: number;
}

export interface LayoutResult {
  grid: LayoutGrid;
  overview: LayoutPlacement[];
  groups: LayoutGroup[];
}

export interface LayoutSceneOptions {
  gridColumns?: number;
  gridGap?: number;
  overrides?: Readonly<Record<string, LayoutPatch>>;
  themeLayout?: (steps: readonly LayoutStep[], options: LayoutSceneOptions) => LayoutResult;
}
