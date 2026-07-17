import type {
  LayoutPatch,
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
    applyPatch(buildPlacement(step, index, columns, gap, 0, null), overrides?.[step.id]),
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
        overrides?.[step.id],
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
