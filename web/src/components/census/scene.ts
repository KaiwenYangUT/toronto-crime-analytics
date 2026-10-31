// Builds the Plotly trace and layout for the census scatter. Pure: no Plotly import, so it is unit-tested
// and never pulls the library into a core chunk.
import { formatNumber, type DisplayFormat } from '../../lib/results.ts'
import { DEFAULT_CAMERA } from './camera.ts'
import type { CensusScatterData } from './types.ts'

export interface SceneTheme {
  bg: string
  text: string
  muted: string
  border: string
  font: string
  /** --ramp-magnitude-1 .. 10, low to high, for the active theme */
  ramp: string[]
}

export interface CensusFormats {
  ratio: DisplayFormat
  income: DisplayFormat
  robberies: DisplayFormat
}

export const AXIS_TITLES = {
  x: 'Permanent job to labour force ratio',
  y: 'Individual median income (CAD)',
  z: 'Robberies reported in 2020',
} as const
export const COLORBAR_TITLE = 'Robberies (2020)'
export const RAMP_STEPS = 10
const FALLBACK: SceneTheme = {
  bg: '#FFFFFF',
  text: '#15181C',
  muted: '#4B535E',
  border: '#D9DDE3',
  font: 'system-ui, sans-serif',
  ramp: ['#FDE725', '#B4DE2C', '#6DCD59', '#35B779', '#1F9E89', '#26828E', '#31688E', '#3E4989', '#482878', '#440154'],
}

/** Reads the active theme from CSS custom properties (computed style of the root element). */
export function readTheme(style: { getPropertyValue(name: string): string }): SceneTheme {
  const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    bg: get('--bg', FALLBACK.bg),
    text: get('--text', FALLBACK.text),
    muted: get('--text-muted', FALLBACK.muted),
    border: get('--border', FALLBACK.border),
    font: get('--font-ui', FALLBACK.font),
    ramp: Array.from({ length: RAMP_STEPS }, (_, i) => get(`--ramp-magnitude-${i + 1}`, FALLBACK.ramp[i])),
  }
}

export function colorscale(ramp: string[]): [number, string][] {
  return ramp.map((c, i) => [i / (ramp.length - 1), c])
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Hover text with the same decimals as the data table and the flat view's tooltips. */
export function hoverText(p: CensusScatterData['points'][number], f: CensusFormats): string {
  return [
    `Neighbourhood: ${esc(p.name)}`,
    `Job-to-labour-force ratio: ${formatNumber(p.ratio, f.ratio)}`,
    `Median income ($): ${formatNumber(p.income, f.income)}`,
    `Robberies: ${formatNumber(p.robberies, f.robberies)}`,
  ].join('<br>')
}

export function buildTrace(data: CensusScatterData, f: CensusFormats, t: SceneTheme, compact = false) {
  const counts = data.points.map((p) => p.robberies)
  return {
    type: 'scatter3d',
    mode: 'markers',
    x: data.points.map((p) => p.ratio),
    y: data.points.map((p) => p.income),
    z: counts,
    hovertext: data.points.map((p) => hoverText(p, f)),
    hoverinfo: 'text',
    marker: markerFor(counts, t, compact),
  }
}

/** Marker styling that depends on the theme; used by the first draw and by theme updates. */
/** `compact` (a narrow box) lays the colour bar out horizontally below the scene. */
export function markerFor(counts: number[], t: SceneTheme, compact = false) {
  return {
    size: 5,
    color: counts,
    cmin: Math.min(...counts),
    cmax: Math.max(...counts),
    colorscale: colorscale(t.ramp),
    opacity: 1,
    // the low end of the ramp is close to the background, so every marker gets an outline
    line: { color: t.text, width: 1 },
    colorbar: {
      title: { text: COLORBAR_TITLE, side: compact ? 'top' : 'right', font: { color: t.text, size: 15, family: t.font } },
      ...(compact ? { orientation: 'h', x: 0.5, xanchor: 'center', y: 0, yanchor: 'top', len: 0.8, thickness: 12 } : { len: 0.75, thickness: 14 }),
      tickfont: { color: t.muted, size: 14, family: t.font },
      outlinecolor: t.border,
      outlinewidth: 1,
    },
  }
}

/** Break a title in two near the middle, at a space. */
export function wrapTitle(title: string): string {
  const mid = title.length / 2
  let best = -1
  for (let i = 0; i < title.length; i++) if (title[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i
  return best < 0 ? title : `${title.slice(0, best)}<br>${title.slice(best + 1)}`
}

function axis(title: string, t: SceneTheme, extra: Record<string, unknown> = {}) {
  return {
    // two-line titles stay inside the canvas at the default camera
    title: { text: wrapTitle(title), font: { color: t.text, size: 14, family: t.font } },
    tickfont: { color: t.muted, size: 14, family: t.font },
    gridcolor: t.border,
    zerolinecolor: t.border,
    linecolor: t.muted,
    showbackground: false,
    ...extra,
  }
}

export function buildLayout(t: SceneTheme, opts: { camera: boolean; compact?: boolean } = { camera: true }) {
  return {
    // one revision for the whole life of the scene, so a theme update never resets the reader's camera
    uirevision: 'census',
    autosize: true,
    margin: { l: 0, r: 0, t: 0, b: opts.compact ? 64 : 24 },
    paper_bgcolor: t.bg,
    plot_bgcolor: t.bg,
    font: { family: t.font, size: 14, color: t.text },
    hoverlabel: { bgcolor: t.bg, bordercolor: t.border, font: { color: t.text, size: 14, family: t.font }, align: 'left' },
    scene: {
      bgcolor: t.bg,
      ...(opts.camera ? { camera: DEFAULT_CAMERA } : {}),
      // a slightly smaller box keeps the long axis titles inside the canvas at the default camera
      aspectmode: 'manual',
      aspectratio: opts.compact ? { x: 0.6, y: 0.6, z: 0.8 } : { x: 0.85, y: 0.85, z: 1 },
      xaxis: axis(AXIS_TITLES.x, t),
      yaxis: axis(AXIS_TITLES.y, t),
      zaxis: axis(AXIS_TITLES.z, t, { rangemode: 'tozero' }),
    },
  }
}

/** Boxes narrower than this get the compact colour bar. */
export const COMPACT_BELOW = 600

export const PLOT_CONFIG = { displayModeBar: false, responsive: true, scrollZoom: false } as const
