import type {
  LayoutPatch,
  LayoutPatchSource,
  LayoutPlacement,
  LayoutResult,
  LayoutSceneOptions,
  LayoutStep,
} from "./types.js";

export type {
  LayoutGroup,
  LayoutPatch,
  LayoutPlacement,
  LayoutResult,
  LayoutSceneOptions,
  LayoutStep,
} from "./types.js";

export const SILMARIL_NOT_IMPLEMENTED_LAYOUT = "SILMARIL_NOT_IMPLEMENTED_LAYOUT";

function normaliseSteps(
  steps: readonly LayoutStep[] | { steps: readonly LayoutStep[] },
): readonly LayoutStep[] {
  if (Array.isArray(steps)) {
    return steps;
  }

  if (steps && typeof steps === "object" && "steps" in steps && Array.isArray(steps.steps)) {
    return steps.steps;
  }

  return [];
}

function applyPatch(
  placement: LayoutPlacement,
  patch: LayoutPatch | undefined,
): LayoutPlacement {
  if (!patch) {
    return placement;
  }

  return {
    ...placement,
    x: patch.x ?? placement.x,
    y: patch.y ?? placement.y,
    scale: patch.scale ?? placement.scale,
    rotate: patch.rotate ?? placement.rotate,
  };
}

function mergeLayoutPatches(...patches: readonly (LayoutPatch | undefined)[]): LayoutPatch | undefined {
  const merged: LayoutPatch = {};

  for (const patch of patches) {
    if (!patch) {
      continue;
    }

    if (typeof patch.x === "number") {
      merged.x = patch.x;
    }
    if (typeof patch.y === "number") {
      merged.y = patch.y;
    }
    if (typeof patch.scale === "number") {
      merged.scale = patch.scale;
    }
    if (typeof patch.rotate === "number") {
      merged.rotate = patch.rotate;
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function selectSparseLayoutPatch(source: LayoutPatchSource): LayoutPatch {
  const patch: LayoutPatch = {};

  if (typeof source.x === "number") {
    patch.x = source.x;
  }
  if (typeof source.y === "number") {
    patch.y = source.y;
  }
  if (typeof source.scale === "number") {
    patch.scale = source.scale;
  }
  if (typeof source.rotate === "number") {
    patch.rotate = source.rotate;
  }

  return patch;
}

function hasLayoutPatch(source: LayoutPatchSource): boolean {
  return typeof source.x === "number"
    || typeof source.y === "number"
    || typeof source.scale === "number"
    || typeof source.rotate === "number";
}

function buildPatch(step: LayoutStep, overrides: Readonly<Record<string, LayoutPatch>> | undefined): LayoutPatch | undefined {
  const override = overrides?.[step.id];
  const stepPatch = hasLayoutPatch(step) ? selectSparseLayoutPatch(step) : undefined;
  const overridePatch = override && hasLayoutPatch(override) ? selectSparseLayoutPatch(override) : undefined;

  if (!stepPatch) {
    return overridePatch;
  }
  if (!overridePatch) {
    return stepPatch;
  }

  return mergeLayoutPatches(stepPatch, overridePatch);
}

function buildPlacement(
  step: LayoutStep,
  index: number,
  columns: number,
  gap: number,
  groupIndex: number,
  groupId: string | null,
): LayoutPlacement {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const x = column * gap + (groupIndex > 0 ? groupIndex * (columns + 1) * gap : 0);
  const y = row * gap + (groupId === null ? 0 : Math.max(0, groupIndex - 1) * gap * 0.5);

  return {
    id: step.id,
    title: step.title,
    x,
    y,
    scale: 1,
    rotate: 0,
    groupId,
  };
}

export function layoutScene(
  steps: readonly LayoutStep[] | { steps: readonly LayoutStep[] },
  options: LayoutSceneOptions = {},
): LayoutResult {
  if (typeof options.themeLayout === "function") {
    return options.themeLayout(normaliseSteps(steps), {
      ...options,
      themeLayout: undefined,
    });
  }

  const sceneSteps = normaliseSteps(steps);
  const columns = options.gridColumns ?? 3;
  const gap = options.gridGap ?? 24;
  const overrides = options.overrides;

  const overviewSteps = sceneSteps.filter((step) => step.groupId === null);
  const overview = overviewSteps.map((step, index) =>
    applyPatch(buildPlacement(step, index, columns, gap, 0, null), buildPatch(step, overrides)),
  );

  const groupOrder: string[] = [];
  const groupMap = new Map<string, LayoutStep[]>();

  for (const step of sceneSteps) {
    if (step.groupId === null) {
      continue;
    }

    if (!groupMap.has(step.groupId)) {
      groupMap.set(step.groupId, []);
      groupOrder.push(step.groupId);
    }

    groupMap.get(step.groupId)?.push(step);
  }

  const groups = groupOrder.map((groupId, groupIndex) => {
    const stepsInGroup = groupMap.get(groupId) ?? [];
    const items = stepsInGroup.map((step, index) =>
      applyPatch(
        buildPlacement(step, index, columns, gap, groupIndex + 1, groupId),
        buildPatch(step, overrides),
      ),
    );

    return {
      id: groupId,
      title: groupId,
      steps: items,
    };
  });

  return {
    grid: {
      columns,
      gap,
    },
    overview,
    groups,
  };
}
