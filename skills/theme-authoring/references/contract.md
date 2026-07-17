# Theme contract reference

The exported contract is `Theme` in `src/theme/contract.ts`.

## Region descriptor

`ThemeRegionDescriptor`:

- `id: string`
- `title: string`
- `content: string`

## Placement descriptor

`ThemeLayoutPlacement`:

- `id: string`
- `title: string`
- `x: number`
- `y: number`
- `z?: number`
- `scale?: number`
- `rotate?: number`

## Asset descriptor

`ThemeAsset`:

- `name?: string`
- `content: string`
- `mimeType?: string`
- `type?: 'css' | 'script' | 'font' | 'image' | 'svg' | 'text'`

## Theme object

`Theme`:

- `name: string`
- `backgroundColor?: string`
- `accentColor?: string`
- `globalCss?: string`
- `sceneryCss?: string`
- `regionCss?: string`
- `css?: string`
- `scenery?: string`
- `renderRegion?: (region, context) => string`
- `layout?: (regions, context) => readonly ThemeLayoutPlacement[]`
- `validate?: (theme, regions) => readonly string[] | string | null | undefined`
- `assets?: readonly ThemeAsset[]`
- `embeddedAssets?: readonly ThemeAsset[]`

The current template consumes `globalCss`, `sceneryCss`, and `regionCss`. The `css` and `scenery` fields are part of the contract but are not used by the current renderer.
