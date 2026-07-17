export interface ThemeRegionDescriptor {
  readonly id: string;
  readonly title: string;
  readonly content: string;
}

export interface ThemeLayoutPlacement {
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

export interface Theme {
  readonly name: string;
  readonly backgroundColor?: string;
  readonly accentColor?: string;
  readonly globalCss?: string;
  readonly sceneryCss?: string;
  readonly regionCss?: string;
  readonly css?: string;
  readonly scenery?: string;
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
