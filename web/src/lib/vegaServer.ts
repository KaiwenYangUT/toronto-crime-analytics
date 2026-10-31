// Build-time only (imported from route loaders, so it never reaches the browser bundle):
// renders a Vega-Lite spec to SVG so every chart is visible before JavaScript runs.
import * as vega from 'vega'
import * as vl from 'vega-lite'
import { themed, type Mode, type Spec } from './chart.ts'

export interface ChartSvgs {
  light: string
  dark: string
  /** 360 px wide variants, shown under 600 px by chart.module.css. Only a page's main chart carries them. */
  lightNarrow?: string
  darkNarrow?: string
}

export const WIDE_WIDTH = 720
export const NARROW_WIDTH = 360

/**
 * One prerendered SVG. With an explicit `width` (the narrow variant) it overrides the spec's own;
 * without one, the spec's own width wins and 720 is the default.
 */
export async function one(spec: Spec, mode: Mode, width?: number): Promise<string> {
  const sized = width === undefined ? { width: WIDE_WIDTH, ...spec } : { ...spec, width }
  const compiled = vl.compile(themed(sized, mode) as unknown as vl.TopLevelSpec)
  const view = new vega.View(vega.parse(compiled.spec), { renderer: 'none' })
  const svg = await view.toSVG()
  view.finalize()
  return svg
}

/**
 * Light and dark SVGs. Pass `{ narrow: true }` for a page's main chart only: it adds the 360 px
 * variants, which doubles the inlined SVG, so small charts and secondary charts leave it off.
 */
export async function renderSvgs(spec: Spec, opts: { narrow?: boolean } = {}): Promise<ChartSvgs> {
  const svgs: ChartSvgs = { light: await one(spec, 'light'), dark: await one(spec, 'dark') }
  if (opts.narrow) {
    svgs.lightNarrow = await one(spec, 'light', NARROW_WIDTH)
    svgs.darkNarrow = await one(spec, 'dark', NARROW_WIDTH)
  }
  return svgs
}
