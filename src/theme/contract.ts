export interface ThemePlacementPatch {
  readonly x?: number;
  readonly y?: number;
  readonly scale?: number;
  readonly rotate?: number;
}

export interface ThemeRegionDescriptor extends ThemePlacementPatch {
  readonly id: string;
  readonly title: string;
  readonly content: string;
}

export interface ThemeLayoutPlacement extends ThemePlacementPatch {
  readonly id: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly z?: number;
  readonly scale?: number;
  readonly rotate?: number;
}

export interface ThemeAsset {
  readonly name?: string;
  readonly content: string;
  readonly mimeType?: string;
  readonly type?: 'css' | 'script' | 'font' | 'image' | 'svg' | 'text';
}

export interface ThemeOverview {
  readonly id?: string;
  readonly title?: string;
  readonly x: number;
  readonly y: number;
  readonly z?: number;
  readonly scale: number;
  readonly rotate?: number;
  readonly content?: string;
  readonly className?: string;
}

export interface Theme {
  readonly name: string;
  readonly title?: string;
  readonly backgroundColor?: string;
  readonly accentColor?: string;
  readonly bodyClass?: string;
  readonly viewport?: string;
  readonly fallbackHtml?: string;
  readonly hintHtml?: string;
  readonly impressAttributes?: Readonly<Record<string, string | number>>;
  readonly globalCss?: string;
  readonly sceneryCss?: string;
  readonly regionCss?: string;
  readonly css?: string;
  readonly scenery?: string;
  readonly wrapRegion?: boolean;
  readonly overview?: ThemeOverview | 'auto' | false;
  readonly stepClassName?: (
    region: ThemeRegionDescriptor,
    context: { readonly theme: Theme },
  ) => string | undefined;
  readonly renderRegion?: (
    region: ThemeRegionDescriptor,
    context: { readonly theme: Theme },
  ) => string;
  readonly layout?: (
    regions: readonly ThemeRegionDescriptor[],
    context: { readonly theme: Theme },
  ) => readonly ThemeLayoutPlacement[];
  readonly validate?: (
    theme: Theme,
    regions: readonly ThemeRegionDescriptor[],
  ) => readonly string[] | string | null | undefined;
  readonly assets?: readonly ThemeAsset[];
  readonly embeddedAssets?: readonly ThemeAsset[];
}
