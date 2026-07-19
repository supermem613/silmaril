export interface CanvasAttrs {
  width?: number;
  height?: number;
}

export interface SceneAttrs {
  title?: string;
  theme?: string;
  canvas?: CanvasAttrs;
}

export interface RegionGroupAttrs {
  id?: string;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
}

export interface RegionAttrs {
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  group?: RegionGroupAttrs;
}

export interface SceneRegionIR {
  id: string;
  title: string;
  attrs: RegionAttrs;
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

export interface BoardIR extends SceneIR {
  title: string;
  slides: SceneRegionIR[];
}

export interface LayoutPatchSource {
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
}

export interface LayoutPatch extends LayoutPatchSource {
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
}

export interface LayoutStep extends LayoutPatch {
  id: string;
  title: string;
  groupId: string | null;
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
