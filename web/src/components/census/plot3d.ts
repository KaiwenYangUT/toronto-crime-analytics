// The only file that touches Plotly, and only through a dynamic import, so the library stays in its own lazy chunk.
import type Plotly from 'plotly.js-gl3d-dist-min'
import type { PlotlyDiv } from 'plotly.js-gl3d-dist-min'
import { DEFAULT_CAMERA, DEFAULT_EYE, ROTATE_STEP_DEG, rotateEye, zoomEye, type Eye } from './camera.ts'
import { COMPACT_BELOW, PLOT_CONFIG, buildLayout, buildTrace, markerFor, readTheme, type CensusFormats } from './scene.ts'
import type { CensusScatterData } from './types.ts'

type PlotlyApi = typeof Plotly

let loading: Promise<PlotlyApi> | null = null

/** Fetches the Plotly chunk once; a failure clears the cache so a later click can retry. */
export function loadPlotly(): Promise<PlotlyApi> {
  loading ??= import('plotly.js-gl3d-dist-min').then(
    (m) => ((m as unknown as { default?: PlotlyApi }).default ?? (m as unknown as PlotlyApi)),
    (e) => {
      loading = null
      throw e
    },
  )
  return loading
}

export interface Scene {
  reset(): void
  rotate(direction: 'left' | 'right'): void
  zoom(direction: 'in' | 'out'): void
  /** re-read the CSS variables and restyle, keeping the camera */
  restyle(): void
  resize(): void
  destroy(): void
}

const currentEye = (gd: PlotlyDiv): Eye => gd._fullLayout?.scene?.camera?.eye ?? gd.layout?.scene?.camera?.eye ?? DEFAULT_EYE
const isCompact = (el: HTMLElement) => el.clientWidth < COMPACT_BELOW
const themeNow = () => readTheme(getComputedStyle(document.documentElement))

export async function mountScene(root: HTMLElement, data: CensusScatterData, formats: CensusFormats): Promise<Scene> {
  const plotly = await loadPlotly()
  const counts = data.points.map((p) => p.robberies)
  let compact = isCompact(root)
  const gd = await plotly.newPlot(root, [buildTrace(data, formats, themeNow(), compact)], buildLayout(themeNow(), { camera: true, compact }), PLOT_CONFIG)
  const setEye = (eye: Eye) => void plotly.relayout(gd, { 'scene.camera': { ...DEFAULT_CAMERA, eye } })
  const scene: Scene = {
    reset: () => setEye(DEFAULT_EYE),
    rotate: (d) => setEye(rotateEye(currentEye(gd), d === 'left' ? -ROTATE_STEP_DEG : ROTATE_STEP_DEG)),
    zoom: (d) => setEye(zoomEye(currentEye(gd), d)),
    restyle: () => {
      const t = themeNow()
      compact = isCompact(root)
      // react() with the same uirevision keeps whatever camera the reader has set
      void plotly.react(gd, [{ ...buildTrace(data, formats, t, compact), marker: markerFor(counts, t, compact) }], buildLayout(t, { camera: false, compact }), PLOT_CONFIG)
    },
    resize: () => {
      plotly.Plots.resize(gd)
      if (isCompact(root) !== compact) scene.restyle() // crossing the width threshold re-lays out the colour bar
    },
    destroy: () => plotly.purge(gd),
  }
  return scene
}
