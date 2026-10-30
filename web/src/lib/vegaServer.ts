// Build-time only (imported from route loaders, so it never reaches the browser bundle):
// renders a Vega-Lite spec to SVG so every chart is visible before JavaScript runs.
import * as vega from 'vega'
import * as vl from 'vega-lite'
import { themed, type Mode, type Spec } from './chart.ts'

export interface ChartSvgs {
  light: string
  dark: string
}

async function one(spec: Spec, mode: Mode): Promise<string> {
  const compiled = vl.compile(themed({ width: 720, ...spec }, mode) as unknown as vl.TopLevelSpec)
  const view = new vega.View(vega.parse(compiled.spec), { renderer: 'none' })
  const svg = await view.toSVG()
  view.finalize()
  return svg
}

export async function renderSvgs(spec: Spec): Promise<ChartSvgs> {
  return { light: await one(spec, 'light'), dark: await one(spec, 'dark') }
}
