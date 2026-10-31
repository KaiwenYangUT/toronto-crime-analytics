// Vega-Lite specs for the Explain, Predict and Overview figures, built from page results.
// Marks take their colours from the theme's named styles (accent, muted, ink), so light and dark
// modes need no per-mode code here. Table cells use the stored display formats.
import { getValue, numberText, type PageResults } from './results.ts'
import type { Mode, Spec } from './chart.ts'
import type { TableRow } from '../components/Figure.tsx'
import type { ChartSvgs } from './vegaServer.ts'

export interface FigureData {
  spec: Spec
  table: TableRow[]
  description: string
}

const num = (d: PageResults, k: string) => getValue(d, k) as number
const fmt = (d: PageResults, k: string) => numberText(d, k)

export const DESIGN_A = 'A_neighbourhood_grouped_5fold_cv'
export const DESIGN_B = 'B_temporal_holdout_train_to_2021_test_2022_2023'
export const RUNGS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const
export const RUNG_LABEL: Record<string, string> = {
  L1: 'Time only',
  L2: '+ place',
  L3: '+ census',
  L4: 'Random forest',
  L5: 'XGBoost',
}
/** Plain model names for the site (RUNG_LABEL keeps the rung codes the paper's figure uses). */
const PLAIN_RUNG: Record<string, string> = {
  L1: 'Time only',
  L2: 'Time, place and coordinates',
  L3: 'Adds census data',
  L4: 'Random forest',
  L5: 'XGBoost',
}
/** The name of one model on the site: no rung codes; the no-premises variants say what they leave out. */
export function modelLabel(rung: string, noPremises = false): string {
  if (!noPremises) return PLAIN_RUNG[rung]
  return rung === 'L2' ? 'Time and coordinates' : `${PLAIN_RUNG[rung]}, without type of place`
}
/** A clock hour as '3am', '3pm', 'noon' or '12am'. */
export const hourText = (h: number): string => (h === 0 ? '12am' : h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm`)
const HOUR_EXPR = "(datum.value == 0 ? '12am' : datum.value == 12 ? 'noon' : datum.value % 12 + (datum.value < 12 ? 'am' : 'pm'))"
export type Metric = 'pr_auc' | 'roc_auc' | 'f1'
export const METRIC_LABEL: Record<Metric, string> = { pr_auc: 'PR-AUC', roc_auc: 'ROC-AUC', f1: 'F1 at the tuned threshold' }

export const ABL = 'predict.ablation'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Share of reported property-type incidents that are robberies, by year.
 * `labelSize` is the size of the two end labels. The default 13 is pinned because the paper's first figure reuses this
 * builder and must not move; site pages pass `null` to take the theme's text size.
 */
export function shareByYear(d: PageResults, opts: { labelSize?: number | null } = {}): FigureData {
  const labelSize = opts.labelSize === undefined ? 13 : opts.labelSize
  const labelMark = labelSize === null ? {} : { fontSize: labelSize }
  const years = Object.keys((getValue(d, 'explain.sta303_v2:prevalence_by_year') as object))
  const rows = years.map((y) => ({
    year: y,
    share: num(d, `explain.sta303_v2:prevalence_by_year.${y}.share`),
    label: fmt(d, `explain.sta303_v2:prevalence_by_year.${y}.share`),
  }))
  const spec: Spec = {
    height: 220,
    data: { values: rows },
    encoding: { x: { field: 'year', type: 'ordinal', title: null, axis: { labelAngle: 0 } } },
    layer: [
      { mark: { type: 'line', style: 'accent', point: { filled: true, size: 70, style: 'accent' } }, encoding: { y: { field: 'share', type: 'quantitative', title: 'Robbery share of incidents', axis: { format: '.0%' }, scale: { domain: [0, 0.25] } } } },
      { transform: [{ filter: "datum.year === '2014' || datum.year === '2023'" }], mark: { type: 'text', style: 'ink', dy: -14, fontWeight: 600, ...labelMark }, encoding: { y: { field: 'share', type: 'quantitative' }, text: { field: 'label' } } },
    ],
  }
  return {
    spec,
    table: rows.map((r) => ({ Year: r.year, 'Robbery share': r.label })),
    description: `Line chart of the robbery share of reported property-type incidents from ${years[0]} to ${years[years.length - 1]}, falling from ${rows[0].label} to ${rows[rows.length - 1].label}.`,
  }
}

export interface ForestRow {
  group: string
  term: string
  or: number
  lo: number
  hi: number
  highlight: boolean
  label: string
  loText: string
  hiText: string
}

const HIGHLIGHT = new Set(['Post-2019 period', 'After dark', 'Hour 15:00'])

/** One row per odds ratio of the STA303 v2 model, with the cluster-robust 95% interval. */
export function forestRows(d: PageResults): ForestRow[] {
  const K = 'explain.sta303_v2'
  const rows: ForestRow[] = []
  const add = (group: string, term: string, base: string) =>
    rows.push({
      group,
      term,
      or: num(d, `${K}:${base}.or`),
      lo: num(d, `${K}:${base}.robust_or_lo`),
      hi: num(d, `${K}:${base}.robust_or_hi`),
      highlight: HIGHLIGHT.has(term),
      label: fmt(d, `${K}:${base}.or`),
      loText: fmt(d, `${K}:${base}.robust_or_lo`),
      hiText: fmt(d, `${K}:${base}.robust_or_hi`),
    })
  add('Period', 'Post-2019 period', 'post2019')
  add('Darkness', 'After dark', 'dark')
  for (let h = 0; h < 24; h++) if (h !== 12) add('Hour (vs noon)', `Hour ${String(h).padStart(2, '0')}:00`, `hour_or_vs_12.${h}`)
  for (let m = 2; m <= 12; m++) add('Month (vs January)', `Month ${MONTHS[m - 1]}`, `month_or_vs_jan.${m}`)
  for (let w = 2; w <= 7; w++) add('Weekday (vs Monday)', `Weekday ${WEEKDAYS[w - 1]}`, `weekday_or_vs_mon.${w}`)
  return rows
}

/** Forest plot of the odds ratios of robbery vs other property crime, with cluster-robust 95% intervals. */
export function forestPlot(d: PageResults): FigureData {
  // hours read as '3pm' here; forestRows keeps the 24-hour terms because the paper's figure prints them
  const rows = forestRows(d).map((r) => ({ ...r, term: r.term.replace(/^Hour (\d\d):00$/, (_, h) => `Hour ${hourText(Number(h))}`), group: r.group.replace('vs noon', 'against noon') }))
  const order = rows.map((r) => r.term)
  const y = { field: 'term', type: 'nominal', sort: order, title: null, axis: { labelLimit: 140, ticks: false, domain: false, grid: true } }
  const x = { type: 'quantitative', scale: { type: 'log', domain: [0.35, 3] }, axis: { values: [0.5, 0.75, 1, 1.5, 2, 3], format: '~g', title: 'Odds ratio (1 = no difference)' } }
  const spec: Spec = {
    height: { step: 17 },
    data: { values: rows },
    layer: [
      { data: { values: [{ v: 1 }] }, mark: { type: 'rule', style: 'muted', strokeDash: [4, 4] }, encoding: { x: { field: 'v', ...x } } },
      { mark: { type: 'rule', style: 'muted', strokeWidth: 1.5 }, encoding: { y, x: { field: 'lo', ...x }, x2: { field: 'hi' } } },
      { mark: { type: 'point', style: 'muted', filled: true, size: 36 }, encoding: { y, x: { field: 'or', ...x } } },
      { transform: [{ filter: 'datum.highlight' }], mark: { type: 'rule', style: 'accent', strokeWidth: 3 }, encoding: { y, x: { field: 'lo', ...x }, x2: { field: 'hi' } } },
      { transform: [{ filter: 'datum.highlight' }], mark: { type: 'point', style: 'accent', filled: true, size: 90 }, encoding: { y, x: { field: 'or', ...x } } },
      { transform: [{ filter: 'datum.highlight' }], mark: { type: 'text', style: 'ink', align: 'left', dx: 8, fontWeight: 600 }, encoding: { y, x: { field: 'hi', ...x }, text: { field: 'label' } } },
    ],
  }
  const table = rows.map((r) => ({ Group: r.group, Term: r.term, 'Odds ratio': r.label, '95% interval low': r.loText, '95% interval high': r.hiText }))
  return {
    spec,
    table,
    description:
      'Forest plot on a log axis with one row for the period after 2019, darkness, each hour against noon, each month against January and each weekday against Monday. Most hours and several months have intervals that exclude one; most weekdays do not.',
  }
}

type Row = { rung: string; series: string; design: string; withPremises: boolean; premises: string; estimate: number; lo: number; hi: number; text: [string, string, string] }

export function ablationRows(d: PageResults, metric: Metric): Row[] {
  const rows: Row[] = []
  for (const [design, dlabel] of [[DESIGN_A, 'Grouped CV'], [DESIGN_B, 'Temporal holdout']] as const) {
    for (const rung of RUNGS) {
      for (const noPrem of [false, true]) {
        if (noPrem && rung === 'L1') continue
        const name = noPrem ? `${rung}-nopremises` : rung
        const p = `${ABL}:designs.${design}.variants.${name}.${metric}`
        rows.push({
          rung: `${rung} ${RUNG_LABEL[rung]}`,
          series: `${dlabel}${noPrem ? ', no premises' : ''}`,
          design: dlabel,
          withPremises: !noPrem,
          premises: noPrem ? 'without premises and location type' : 'with premises and location type',
          estimate: num(d, `${p}.estimate`),
          lo: num(d, `${p}.lo`),
          hi: num(d, `${p}.hi`),
          text: [fmt(d, `${p}.estimate`), fmt(d, `${p}.lo`), fmt(d, `${p}.hi`)],
        })
      }
    }
  }
  return rows
}

/** The ablation ladder: one metric per rung, both evaluation designs, with and without premises. */
export function ablationLadder(d: PageResults, metric: Metric): FigureData {
  const rows = ablationRows(d, metric)
  const order = RUNGS.map((r) => `${r} ${RUNG_LABEL[r]}`)
  const seriesOrder = ['Grouped CV', 'Temporal holdout', 'Grouped CV, no premises', 'Temporal holdout, no premises']
  const xo = { field: 'series', type: 'nominal', sort: seriesOrder }
  const common = { xOffset: xo, x: { field: 'rung', type: 'nominal', sort: order, title: null, axis: { labelAngle: 0, labelPadding: 8, labelExpr: "split(datum.value, ' ')[0]" } } }
  const y = { type: 'quantitative', title: METRIC_LABEL[metric], scale: { domain: metric === 'roc_auc' ? [0.45, 1] : [0, metric === 'pr_auc' ? 0.75 : 0.7] } }
  const baseA = num(d, `${ABL}:designs.${DESIGN_A}.prevalence`)
  const baseB = num(d, `${ABL}:designs.${DESIGN_B}.prevalence`)
  const refs =
    metric === 'pr_auc'
      ? [
          { v: baseA, label: 'Baseline: share of robberies, grouped CV' },
          { v: baseB, label: 'Baseline: share of robberies, temporal holdout' },
        ]
      : metric === 'roc_auc'
        ? [{ v: num(d, `${ABL}:designs.${DESIGN_A}.L0.roc_auc`), label: 'Chance' }]
        : []
  const layers: Spec[] = [
    ...refs.map((r) => ({ data: { values: [r] }, mark: { type: 'rule', style: 'muted', strokeDash: [2, 4] }, encoding: { y: { field: 'v', ...y } } })),
    { mark: { type: 'rule', style: 'accent', strokeWidth: 2 }, encoding: { ...common, y: { field: 'lo', ...y }, y2: { field: 'hi' }, strokeDash: { field: 'premises', type: 'nominal', scale: { domain: ['with premises and location type', 'without premises and location type'], range: [[1, 0], [4, 3]] }, legend: null }, opacity: { field: 'premises', type: 'nominal', scale: { range: [1, 0.5] }, legend: null } } },
    { mark: { type: 'point', style: ['accent', 'accentOutline'], size: 70, strokeWidth: 2 }, encoding: { ...common, y: { field: 'estimate', ...y }, fillOpacity: { field: 'design', type: 'nominal', scale: { domain: ['Grouped CV', 'Temporal holdout'], range: [1, 0] }, legend: null }, opacity: { field: 'premises', type: 'nominal', scale: { range: [1, 0.5] }, legend: null }, tooltip: [{ field: 'series' }, { field: 'rung' }, { field: 'estimate', format: '.3f' }, { field: 'lo', format: '.3f' }, { field: 'hi', format: '.3f' }] } },
  ]
  const spec: Spec = { height: 340, data: { values: rows }, layer: layers }
  const table = rows.map((r) => ({
    Rung: r.rung,
    Design: r.series,
    [METRIC_LABEL[metric]]: r.text[0],
    'Interval low': r.text[1],
    'Interval high': r.text[2],
  }))
  return {
    spec,
    table,
    description: `Points with 95% intervals for ${METRIC_LABEL[metric]} at each of five model rungs, for grouped cross-validation and the temporal holdout, with dashed lighter intervals for models without premises and location type.`,
  }
}

/** Precision-recall curves for the five rungs of one evaluation design. */
export function prCurves(d: PageResults, design: typeof DESIGN_A | typeof DESIGN_B): FigureData {
  const rows: { rung: string; recall: number; precision: number; text: [string, string] }[] = []
  for (const rung of RUNGS) {
    const base = `${ABL}:designs.${design}.variants.${rung}.pr_curve`
    const precision = getValue(d, `${base}.precision`) as number[]
    const recall = getValue(d, `${base}.recall`) as number[]
    precision.forEach((p, i) => rows.push({ rung: modelLabel(rung), recall: recall[i], precision: p, text: [fmt(d, `${base}.recall.${i}`), fmt(d, `${base}.precision.${i}`)] }))
  }
  const order = RUNGS.map((r) => modelLabel(r))
  const prev = num(d, `${ABL}:designs.${design}.prevalence`)
  const spec: Spec = {
    height: 320,
    data: { values: rows },
    layer: [
      { data: { values: [{ v: prev }] }, mark: { type: 'rule', style: 'muted', strokeDash: [2, 4] }, encoding: { y: { field: 'v', type: 'quantitative' } } },
      { mark: { type: 'line', interpolate: 'step-after' }, encoding: { x: { field: 'recall', type: 'quantitative', title: 'Recall', scale: { domain: [0, 1] }, axis: { values: [0, 0.2, 0.4, 0.6, 0.8, 1], format: '.1f' } }, y: { field: 'precision', type: 'quantitative', title: 'Precision', scale: { domain: [0, 1] } }, color: { field: 'rung', type: 'ordinal', sort: order, title: null, scale: { domain: order } }, strokeDash: { field: 'rung', type: 'ordinal', sort: order, legend: null, scale: { domain: order, range: [[1, 0], [6, 3], [2, 2], [8, 3, 2, 3], [4, 4]] } } } },
    ],
  }
  return {
    spec,
    table: rows.filter((_, i) => i % 10 === 0).map((r) => ({ Model: r.rung, Recall: r.text[0], Precision: r.text[1] })),
    description: 'Precision against recall for the five models. The time-only curve sits only a little above the dotted line for the robbery share; the curves for the models that know the type of place rise well above it.',
  }
}

const BLOCK_LABEL: Record<string, string> = { premises: 'Type of place', time: 'Time', census: 'Census data', geo: 'Coordinates' }

/** Grouped permutation importance of the XGBoost rung: PR-AUC lost when one block of features is shuffled. */
export function blockImportance(d: PageResults): FigureData {
  const base = `${ABL}:designs.${DESIGN_A}.variants.L5.block_permutation_importance_pr_auc_drop`
  const blocks = Object.keys(getValue(d, base) as object)
  const rows = blocks
    .map((b) => ({ block: BLOCK_LABEL[b] ?? b, drop: num(d, `${base}.${b}`), label: fmt(d, `${base}.${b}`) }))
    .sort((a, b) => b.drop - a.drop)
  const spec: Spec = {
    height: { step: 36 },
    data: { values: rows },
    encoding: { y: { field: 'block', type: 'nominal', sort: rows.map((r) => r.block), title: null, axis: { labelLimit: 150 } }, x: { field: 'drop', type: 'quantitative', title: 'Score lost when scrambled (PR-AUC)', scale: { domain: [0, 0.5] }, axis: { tickCount: 5 } } },
    layer: [
      { mark: { type: 'bar', style: 'accent', height: { band: 0.6 } } },
      { mark: { type: 'text', style: 'ink', align: 'left', dx: 6, fontWeight: 600 }, encoding: { text: { field: 'label' } } },
    ],
  }
  return {
    spec,
    table: rows.map((r) => ({ Information: r.block, 'PR-AUC lost': r.label })),
    description: 'Horizontal bars: scrambling the type of place costs the most PR-AUC, far more than time, census data or coordinates.',
  }
}

/** Robbery share by weekday or hour in the 2020 course data, to check the original captions. */
export function patternChart(d: PageResults, kind: 'weekday' | 'hour'): FigureData {
  const C = 'predict.eda_corrections:claims'
  const rows =
    kind === 'weekday'
      ? WEEKDAYS.map((w) => ({ x: w, share: num(d, `${C}.weekend_peak.robbery_share_by_day.${w}`), label: fmt(d, `${C}.weekend_peak.robbery_share_by_day.${w}`) }))
      : Array.from({ length: 24 }, (_, h) => ({ x: hourText(h), hour: h, share: num(d, `${C}.hourly_shape.robbery_share_by_hour.${h}`), label: fmt(d, `${C}.hourly_shape.robbery_share_by_hour.${h}`) }))
  const spec: Spec = {
    height: 220,
    data: { values: rows },
    mark: { type: 'bar', style: 'accent', width: { band: 0.6 } },
    encoding: { x: { field: 'x', type: 'ordinal', sort: rows.map((r) => r.x), title: kind === 'hour' ? 'Hour of day' : null, axis: { labelAngle: 0, labelOverlap: true, ...(kind === 'hour' ? { labelExpr: "indexof(['12am', '3am', '6am', '9am', 'noon', '3pm', '6pm', '9pm'], datum.value) < 0 ? '' : datum.value" } : {}) } }, y: { field: 'share', type: 'quantitative', title: 'Robbery share of incidents', axis: { format: '.0%' } }, tooltip: [{ field: 'x' }, { field: 'label', title: 'Share' }] },
  }
  return {
    spec,
    table: rows.map((r) => ({ [kind === 'hour' ? 'Hour' : 'Weekday']: r.x, 'Robbery share': r.label })),
    description: kind === 'hour' ? 'Bars of the robbery share by hour of day; the share jumps between hours rather than following a smooth curve.' : 'Bars of the robbery share by weekday; Saturday is highest; Tuesday and Sunday are lowest and close together.',
  }
}

/** Calibration of the STA303 v2 model: mean predicted vs observed robbery share in ten risk-ordered groups. */
export function calibrationChart(d: PageResults): FigureData {
  const base = 'explain.sta303_v2:calibration_deciles'
  const n = (getValue(d, base) as unknown[]).length
  const rows = Array.from({ length: n }, (_, i) => ({
    decile: i + 1,
    predicted: num(d, `${base}.${i}.mean_predicted`),
    observed: num(d, `${base}.${i}.observed`),
    text: [fmt(d, `${base}.${i}.mean_predicted`), fmt(d, `${base}.${i}.observed`)],
  }))
  const x = { type: 'quantitative', scale: { domain: [0, 0.4] }, axis: { format: '.0%', title: 'Mean predicted probability of robbery' } }
  const y = { type: 'quantitative', scale: { domain: [0, 0.4] }, axis: { format: '.0%', title: 'Observed robbery share' } }
  const spec: Spec = {
    height: 300,
    width: 300,
    data: { values: rows },
    layer: [
      { data: { values: [{ a: 0 }, { a: 0.4 }] }, mark: { type: 'line', style: 'muted', strokeDash: [4, 4] }, encoding: { x: { field: 'a', ...x }, y: { field: 'a', ...y } } },
      { mark: { type: 'point', style: 'accent', filled: true, size: 80 }, encoding: { x: { field: 'predicted', ...x }, y: { field: 'observed', ...y }, tooltip: [{ field: 'decile' }, { field: 'predicted', format: '.1%' }, { field: 'observed', format: '.1%' }] } },
    ],
  }
  return {
    spec,
    table: rows.map((r) => ({ Group: r.decile, 'Mean predicted': r.text[0], Observed: r.text[1] })),
    description: 'Ten points of mean predicted probability against the observed robbery share, close to the diagonal: the model is well calibrated, even though it separates the classes only weakly.',
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// P10 builders: prerender widths, odds by time, rung steps, step chart and the flat census scatter.
// ---------------------------------------------------------------------------------------------------------------------

/** Total SVG widths of the static first paint: an 8-column slot at 1280 px, and a phone (375 px minus gutters). */
export const SLOT_WIDTH = { eight: 800, narrow: 330 } as const

type RenderOne = (spec: Spec, mode: Mode, width?: number) => Promise<string>

const svgWidth = (svg: string): number => Number(/<svg[^>]*\swidth="([\d.]+)"/.exec(svg)?.[1])

/**
 * The widest plot whose whole SVG (axes, labels, legend and padding included) is at most `total` px wide. The SVG
 * width is flat while a wide axis title or legend dominates and grows with the plot after that, so it is bisected.
 */
async function plotWidthFor(one: RenderOne, spec: Spec, total: number): Promise<number> {
  let lo = 60
  let hi = total
  while (hi - lo > 2) {
    const mid = Math.floor((lo + hi) / 2)
    if (svgWidth(await one(spec, 'light', mid)) <= total) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * Build-time SVGs that fit their slot: `total` px wide in total, so the static first paint is the size of the live chart
 * and its 14 px text is not scaled down. With `narrow`, the 360 px variants are rendered too (a page's main chart only).
 * Pass `one` from lib/vegaServer.ts (this file runs in the browser bundle, so it cannot import vega itself).
 */
export async function svgsForSlot(one: RenderOne, spec: Spec, total: number, narrow?: number): Promise<ChartSvgs> {
  const w = await plotWidthFor(one, spec, total)
  const svgs: ChartSvgs = { light: await one(spec, 'light', w), dark: await one(spec, 'dark', w) }
  if (narrow) {
    const n = await plotWidthFor(one, spec, narrow)
    svgs.lightNarrow = await one(spec, 'light', n)
    svgs.darkNarrow = await one(spec, 'dark', n)
  }
  return svgs
}

const OR_TICKS = [0.5, 0.75, 1, 1.5, 2, 3]
const HOUR_POS = (h: number) => h
const MONTH_POS = (m: number) => 25 + (m - 1)
const DAY_POS = (w: number) => 38 + (w - 1)

/**
 * Hour, month and weekday odds ratios as three small multiples that share one log axis. They are one view with three
 * labelled x ranges, so it keeps working at any container width (the live chart sizes to its container) and at 360 px.
 */
export function oddsByTime(d: PageResults): FigureData {
  const K = 'explain.sta303_v2'
  type R = { panel: string; term: string; pos: number; or: number; lo: number; hi: number; ref: boolean; label: string; ci: string; tip: string; peak: string }
  const rows: R[] = []
  const add = (panel: string, term: string, pos: number, base: string) => {
    const [o, lo, hi] = [`${base}.or`, `${base}.robust_or_lo`, `${base}.robust_or_hi`].map((k) => fmt(d, `${K}:${k}`))
    rows.push({ panel, term, pos, or: num(d, `${K}:${base}.or`), lo: num(d, `${K}:${base}.robust_or_lo`), hi: num(d, `${K}:${base}.robust_or_hi`), ref: false, label: o, ci: `${lo} to ${hi}`, tip: `${o} (${lo} to ${hi})`, peak: `×${o}` })
  }
  const ref = (panel: string, term: string, pos: number) => rows.push({ panel, term, pos, or: 1, lo: 1, hi: 1, ref: true, label: 'Reference', ci: '', tip: 'Reference category', peak: '' })
  for (let h = 0; h < 24; h++) (h === 12 ? ref : add)('Hour', hourText(h), HOUR_POS(h), `hour_or_vs_12.${h}`)
  for (let m = 1; m <= 12; m++) (m === 1 ? ref : add)('Month', MONTHS[m - 1], MONTH_POS(m), `month_or_vs_jan.${m}`)
  for (let w = 1; w <= 7; w++) (w === 1 ? ref : add)('Weekday', WEEKDAYS[w - 1], DAY_POS(w), `weekday_or_vs_mon.${w}`)

  const initials: Record<number, string> = {}
  MONTHS.forEach((m, i) => (initials[MONTH_POS(i + 1)] = m[0]))
  WEEKDAYS.forEach((w, i) => (initials[DAY_POS(i + 1)] = w[0]))
  const ticks = [0, 3, 6, 9, 12, 15, 18, 21, ...Object.keys(initials).map(Number)]
  // Under 420 px of plot the labels thin out: hours every six, every second month (Jan, Mar, ...) and Mon, Wed, Fri, Sun.
  const skipNarrow: Record<number, number> = {}
  for (let m = 2; m <= 12; m += 2) skipNarrow[MONTH_POS(m)] = 1
  for (let w = 2; w <= 6; w += 2) skipNarrow[DAY_POS(w)] = 1
  const labelExpr = `datum.value < 24 ? (width < 420 && datum.value % 6 ? '' : ${HOUR_EXPR}) : (width < 420 && ${JSON.stringify(skipNarrow)}[datum.value] ? '' : ${JSON.stringify(initials)}[datum.value])`
  const xs = { type: 'quantitative', scale: { domain: [-1, 45], nice: false }, axis: { values: ticks, labelExpr, labelAngle: 0, labelOverlap: 'greedy', grid: false, ticks: false, title: null } }
  const x = { field: 'pos', ...xs }
  const y = { type: 'quantitative', scale: { type: 'log', domain: [0.35, 3.4], nice: false }, axis: { values: OR_TICKS, format: '~g', title: 'Odds ratio (1 = no change)' } }
  const heading = (text: string, at: number, align: 'left' | 'right', dx: number) => ({ at, text, align, dx })
  const spec: Spec = {
    height: 340,
    data: { values: rows },
    layer: [
      { data: { values: [{ v: 24 }, { v: 37 }] }, mark: { type: 'rule', style: 'muted', strokeWidth: 1, opacity: 0.35 }, encoding: { x: { field: 'v', ...xs } } },
      { data: { values: [{ v: 1 }] }, mark: { type: 'rule', style: 'muted', strokeDash: [4, 4] }, encoding: { y: { field: 'v', ...y } } },
      {
        data: { values: [heading('Hour', 0, 'left', 0), heading('Month', 25, 'left', -2), heading('Weekday', 44, 'right', 4)] },
        mark: { type: 'text', style: 'muted', fontWeight: 600, baseline: 'top', y: 0, dy: 2 },
        encoding: { x: { field: 'at', ...xs }, text: { field: 'text' } },
      },
      { transform: [{ filter: '!datum.ref' }], mark: { type: 'rule', style: 'accent', strokeWidth: 2 }, encoding: { x, y: { field: 'lo', ...y }, y2: { field: 'hi' } } },
      { transform: [{ filter: '!datum.ref' }], mark: { type: 'point', style: 'accent', filled: true, size: 56 }, encoding: { x, y: { field: 'or', ...y }, tooltip: [{ field: 'panel', title: 'Group' }, { field: 'term', title: 'Term' }, { field: 'tip', title: 'Odds ratio (95% interval)' }] } },
      { transform: [{ filter: 'datum.ref' }], mark: { type: 'point', style: 'accentOutline', filled: false, size: 56, strokeWidth: 2 }, encoding: { x, y: { field: 'or', ...y }, tooltip: [{ field: 'panel', title: 'Group' }, { field: 'term', title: 'Term' }, { field: 'tip', title: 'Odds ratio' }] } },
      { transform: [{ filter: "datum.panel === 'Hour' && datum.term === '3pm'" }], mark: { type: 'text', style: 'ink', align: 'left', dx: 9, fontWeight: 600 }, encoding: { x, y: { field: 'or', ...y }, text: { field: 'peak' } } },
    ],
  }
  return {
    spec,
    table: rows.map((r) => ({ Group: r.panel, Term: r.term, 'Odds ratio': r.ref ? 'Reference' : r.label, '95% interval': r.ci })),
    description:
      'Three panels on one log axis: odds ratios for each hour against noon, each month against January and each weekday against Monday, with 95% intervals. Hours vary from below one half to above two; months and weekdays stay closer to one.',
  }
}

const AFTER_ROWS: { label: string; base: string; pooled: boolean }[] = [
  { label: 'Against all three other types', base: 'post2019', pooled: true },
  { label: 'Against auto theft only', base: 'composition.Auto Theft.post2019', pooled: false },
  { label: 'Against theft over only', base: 'composition.Theft Over.post2019', pooled: false },
  { label: 'Against break and enter only', base: 'composition.Break and Enter.post2019', pooled: false },
]

/**
 * Odds of a robbery after 2019 against 2014 to 2019: the pooled model first, then robbery against each other type on
 * its own. The ratio depends on the comparison group, so the three single comparisons are drawn beside the pooled one.
 */
export function postByComparator(d: PageResults): FigureData {
  const K = 'explain.sta303_v2'
  const rows = AFTER_ROWS.map((r) => ({
    label: r.label,
    pooled: r.pooled,
    or: num(d, `${K}:${r.base}.or`),
    lo: num(d, `${K}:${r.base}.robust_or_lo`),
    hi: num(d, `${K}:${r.base}.robust_or_hi`),
    text: fmt(d, `${K}:${r.base}.or`),
    ci: `${fmt(d, `${K}:${r.base}.robust_or_lo`)} to ${fmt(d, `${K}:${r.base}.robust_or_hi`)}`,
    peak: `×${fmt(d, `${K}:${r.base}.or`)}`,
  }))
  const y = { field: 'label', type: 'nominal', sort: rows.map((r) => r.label), title: null, axis: null }
  const x = { type: 'quantitative', scale: { type: 'log', domain: [0.25, 1.3], nice: false }, axis: { values: [0.25, 0.5, 0.75, 1], format: '~g', title: 'Odds ratio after 2019 (1 = no change)' } }
  const tooltip = [{ field: 'label', title: 'Comparison' }, { field: 'peak', title: 'Odds ratio' }, { field: 'ci', title: '95% interval' }]
  const spec: Spec = {
    height: rows.length * 54,
    data: { values: rows },
    layer: [
      { data: { values: [{ v: 1 }] }, mark: { type: 'rule', style: 'muted', strokeDash: [4, 4] }, encoding: { x: { field: 'v', ...x } } },
      { transform: [{ filter: '!datum.pooled' }], mark: { type: 'rule', style: 'ink', strokeWidth: 2 }, encoding: { y, x: { field: 'lo', ...x }, x2: { field: 'hi' } } },
      { transform: [{ filter: '!datum.pooled' }], mark: { type: 'point', style: 'ink', filled: true, size: 90 }, encoding: { y, x: { field: 'or', ...x }, tooltip } },
      { transform: [{ filter: 'datum.pooled' }], mark: { type: 'rule', style: 'accent', strokeWidth: 3 }, encoding: { y, x: { field: 'lo', ...x }, x2: { field: 'hi' } } },
      { transform: [{ filter: 'datum.pooled' }], mark: { type: 'point', style: 'accent', filled: true, size: 130 }, encoding: { y, x: { field: 'or', ...x }, tooltip } },
      // the value sits beside the bar, on the left when the bar is close to the line at one
      { transform: [{ filter: 'datum.or < 0.7' }], mark: { type: 'text', style: 'ink', align: 'left', dx: 9, fontWeight: 600 }, encoding: { y, x: { field: 'hi', ...x }, text: { field: 'peak' } } },
      { transform: [{ filter: 'datum.or >= 0.7' }], mark: { type: 'text', style: 'ink', align: 'right', dx: -9, fontWeight: 600 }, encoding: { y, x: { field: 'lo', ...x }, text: { field: 'peak' } } },
      { mark: { type: 'text', style: 'ink', align: 'left', baseline: 'bottom', x: 0, dy: -16, fontWeight: 600 }, encoding: { y, text: { field: 'label' } } },
    ],
  }
  return {
    spec,
    table: rows.map((r) => ({ Comparison: r.label, 'Odds ratio': r.text, '95% interval': r.ci })),
    description:
      'Odds ratios for a robbery after 2019 against 2014 to 2019, with 95% intervals, on a log axis. The first row pools all three other types. Against auto theft alone the ratio is lowest, against theft over in between and against break and enter highest, but all are below one.',
  }
}

export interface StepRow {
  id: string
  /** y value: the row label */
  label: string
  design: string
  estimate: number
  lo: number
  hi: number
  text: [string, string, string]
  /** the formatted estimate, for the bar label */
  est: string
}

/** The four rungs shown on the Overview and Predict step charts, in reading order. */
export const STEPS: { id: string; label: string; lines: string[] }[] = [
  { id: 'L1', label: 'Time only', lines: ['Time only'] },
  { id: 'L2', label: 'Time and type of place', lines: ['Time and', 'type of place'] },
  { id: 'L5', label: 'Full model', lines: ['Full model'] },
  { id: 'L5-nopremises', label: 'Full model without type of place', lines: ['Full model', 'without type of place'] },
]
/** The two tests, by the names the site uses: grouped cross-validation and the temporal holdout (2022 to 2023). */
export const TEST_LABEL: Record<string, string> = { [DESIGN_A]: 'New neighbourhoods', [DESIGN_B]: 'Later years' }
const TESTS = [TEST_LABEL[DESIGN_A], TEST_LABEL[DESIGN_B]]
/** The score of guessing for PR-AUC (the robbery share, as a decimal like the scores) or ROC-AUC (one half). */
const guessKey = (design: string, metric: 'pr_auc' | 'roc_auc') => `${ABL}:designs.${design}.L0.${metric === 'pr_auc' ? 'pr_auc_baseline' : 'roc_auc'}`

/** One row per rung (STEPS) and evaluation design, with the 95% bootstrap interval of one metric. */
export function stepRows(d: PageResults, designs: string[] = [DESIGN_A], metric: Metric = 'pr_auc'): StepRow[] {
  return designs.flatMap((design) =>
    STEPS.map((s) => {
      const p = `${ABL}:designs.${design}.variants.${s.id}.${metric}`
      return { id: s.id, label: s.label, design: TEST_LABEL[design] ?? design, estimate: num(d, `${p}.estimate`), lo: num(d, `${p}.lo`), hi: num(d, `${p}.hi`), text: [fmt(d, `${p}.estimate`), fmt(d, `${p}.lo`), fmt(d, `${p}.hi`)] as [string, string, string], est: fmt(d, `${p}.estimate`) }
    }),
  )
}

// Row labels are text marks above each row, not axis labels: the axis would reserve the width of the longest label
// and squeeze the plot on a phone.
const stepY = () => ({ field: 'label', type: 'nominal', sort: STEPS.map((s) => s.label), title: null, axis: null })
const stepTable = (rows: StepRow[], metric: Metric): TableRow[] => rows.map((r) => ({ Model: r.label, Test: r.design, [METRIC_LABEL[metric]]: r.text[0], 'Interval low': r.text[1], 'Interval high': r.text[2] }))
const stepX = (metric: 'pr_auc' | 'roc_auc') => ({ type: 'quantitative', scale: { domain: metric === 'pr_auc' ? [0, 0.75] : [0.35, 1] }, axis: { title: METRIC_LABEL[metric], values: metric === 'pr_auc' ? [0, 0.2, 0.4, 0.6] : [0.5, 0.6, 0.7, 0.8, 0.9, 1], format: '.1f' } })

/**
 * Overview figure: horizontal bars of one metric for the four rungs under one design, with 95% intervals and a grey tick
 * at guessing (the robbery share for PR-AUC, 0.5 for ROC-AUC), both written as decimals like the scores. Generic: pass
 * `design` and `metric`.
 */
export function stepChart(d: PageResults, opts: { design?: typeof DESIGN_A | typeof DESIGN_B; metric?: 'pr_auc' | 'roc_auc' } = {}): FigureData {
  const design = opts.design ?? DESIGN_A
  const metric = opts.metric ?? 'pr_auc'
  const rows = stepRows(d, [design], metric)
  const baseKey = guessKey(design, metric)
  const base = num(d, baseKey)
  const baseText = `Guessing: ${fmt(d, baseKey)}`
  const x = stepX(metric)
  const data = rows.map((r) => ({ ...r, base }))
  const spec: Spec = {
    height: STEPS.length * 56,
    data: { values: data },
    layer: [
      { mark: { type: 'bar', style: 'accent', height: { band: 0.35 } }, encoding: { y: stepY(), x: { field: 'estimate', ...x }, tooltip: [{ field: 'label', title: 'Model' }, { field: 'estimate', format: '.3f', title: METRIC_LABEL[metric] }, { field: 'lo', format: '.3f', title: '95% low' }, { field: 'hi', format: '.3f', title: '95% high' }] } },
      { mark: { type: 'rule', style: 'ink', strokeWidth: 2 }, encoding: { y: stepY(), x: { field: 'lo', ...x }, x2: { field: 'hi' } } },
      { mark: { type: 'text', style: 'ink', align: 'left', dx: 8, fontWeight: 600 }, encoding: { y: stepY(), x: { field: 'hi', ...x }, text: { field: 'est' } } },
      { mark: { type: 'tick', style: 'muted', orient: 'vertical', thickness: 2, size: 26 }, encoding: { y: stepY(), x: { field: 'base', ...x } } },
      { mark: { type: 'text', style: 'ink', align: 'left', baseline: 'bottom', x: 0, dy: -20, fontWeight: 600 }, encoding: { y: stepY(), text: { field: 'label' } } },
      { data: { values: [{ v: base, t: baseText }] }, mark: { type: 'text', style: 'muted', align: 'left', baseline: 'top', y: 0, dx: 6 }, encoding: { x: { field: 'v', ...x }, text: { field: 't' } } },
    ],
  }
  return {
    spec,
    table: stepTable(rows, metric),
    description: `Horizontal bars of ${METRIC_LABEL[metric]} with 95% intervals for four models: time only, time and type of place, the full model, and the full model without type of place. A grey tick marks the score of guessing. Time only sits only a little above it; the models with type of place are far above it.`,
  }
}

/**
 * Predict figure: the four rungs under both tests. New neighbourhoods (grouped cross-validation) are filled and later
 * years (the temporal holdout) hollow, each with its 95% interval; a grey tick beside each point marks the guessing
 * score of its test. The key sits in the chart, above the rows, so the chart is readable on its own.
 */
export function rungSteps(d: PageResults, metric: 'pr_auc' | 'roc_auc' = 'pr_auc'): FigureData {
  const baseOf = (test: string) => num(d, guessKey(test === TEST_LABEL[DESIGN_A] ? DESIGN_A : DESIGN_B, metric))
  const rows = stepRows(d, [DESIGN_A, DESIGN_B], metric).map((r) => ({ ...r, base: baseOf(r.design) }))
  const x = stepX(metric)
  const yOffset = { field: 'design', type: 'nominal', sort: TESTS }
  const tooltip = [{ field: 'label', title: 'Model' }, { field: 'design', title: 'Test' }, { field: 'estimate', format: '.3f', title: METRIC_LABEL[metric] }, { field: 'lo', format: '.3f', title: '95% low' }, { field: 'hi', format: '.3f', title: '95% high' }]
  const first = `datum.id === 'L1' && datum.design === ${JSON.stringify(TESTS[0])}`
  const spec: Spec = {
    height: STEPS.length * 60,
    data: { values: rows },
    layer: [
      { mark: { type: 'tick', style: 'muted', orient: 'vertical', thickness: 2, size: 22 }, encoding: { y: stepY(), yOffset, x: { field: 'base', ...x } } },
      { transform: [{ filter: first }], mark: { type: 'text', style: 'muted', align: 'right', baseline: 'middle', dx: -8, fontWeight: 600 }, encoding: { y: stepY(), yOffset, x: { field: 'base', ...x }, text: { value: 'guessing' } } },
      { mark: { type: 'rule', style: 'accent', strokeWidth: 2.5 }, encoding: { y: stepY(), yOffset, x: { field: 'lo', ...x }, x2: { field: 'hi' } } },
      { mark: { type: 'point', style: ['accent', 'accentOutline'], size: 110, strokeWidth: 2.5 }, encoding: { y: stepY(), yOffset, x: { field: 'estimate', ...x }, fillOpacity: { field: 'design', type: 'nominal', sort: TESTS, scale: { domain: TESTS, range: [1, 0] }, legend: null }, tooltip } },
      // the key: each test is named beside its own marker in the first row
      { transform: [{ filter: "datum.id === 'L1'" }], mark: { type: 'text', style: 'ink', align: 'left', baseline: 'middle', dx: 10 }, encoding: { y: stepY(), yOffset, x: { field: 'hi', ...x }, text: { field: 'design' } } },
      { transform: [{ filter: `datum.design === ${JSON.stringify(TESTS[0])}` }], mark: { type: 'text', style: 'ink', align: 'left', baseline: 'bottom', x: 0, dy: -24, fontWeight: 600 }, encoding: { y: stepY(), text: { field: 'label' } } },
    ],
  }
  return {
    spec,
    table: stepTable(rows, metric),
    description: `Points with 95% intervals for ${METRIC_LABEL[metric]} at four models: time only, time and type of place, the full model, and the full model without type of place, tested on new neighbourhoods (filled) and on later years (hollow). Grey ticks mark the score of guessing in each test. Models with type of place score far above it; time alone only a little.`,
  }
}

const CENSUS = 'predict.census_scatter'

/** Flat view of the neighbourhood scatter: job ratio against median income, colour and area both show the 2020 robbery count. */
export function censusScatter2d(d: PageResults): FigureData {
  const points = getValue(d, `${CENSUS}:points`) as { name: string; ratio: number; income: number; robberies: number }[]
  const maxName = getValue(d, `${CENSUS}:summary.max.name`) as string
  const rows = points.map((p, i) => {
    const f = (field: string) => fmt(d, `${CENSUS}:points.${i}.${field}`)
    return { ...p, area: p.robberies, ratioText: f('ratio'), incomeText: `$${f('income')}`, robberiesText: f('robberies') }
  })
  const x = { field: 'ratio', type: 'quantitative', scale: { zero: false, domain: [0.47, 0.77], nice: false }, axis: { title: ['Permanent job to', 'labour force ratio'], format: '.2f', values: [0.5, 0.55, 0.6, 0.65, 0.7, 0.75] } }
  const y = { field: 'income', type: 'quantitative', scale: { zero: false, domain: [26000, 78000], nice: false }, axis: { title: 'Individual median income (CAD)', format: '$,.0f', values: [30000, 40000, 50000, 60000, 70000] } }
  const spec: Spec = {
    height: 420,
    data: { values: rows },
    layer: [
      {
        // outline marks: the low end of the magnitude ramp is nearly invisible on the page background
        mark: { type: 'point', style: 'accentOutline', filled: true, strokeWidth: 1.25, opacity: 0.9 },
        encoding: {
          x,
          y,
          fill: { field: 'robberies', type: 'quantitative', scale: { type: 'sqrt', domain: [0, 135], range: 'magnitude' }, legend: { title: 'Robberies, 2020', titleLimit: 0, gradientLength: 200, format: ',d', values: [0, 40, 80, 120] } },
          // a copy of the count, so that hiding the size legend does not also hide the colour legend (same-field legends merge)
          size: { field: 'area', type: 'quantitative', scale: { zero: true, range: [50, 900] }, legend: null },
          order: { field: 'robberies', type: 'quantitative', sort: 'descending' },
          tooltip: [{ field: 'name', title: 'Neighbourhood' }, { field: 'ratioText', title: 'Job-to-labour-force ratio' }, { field: 'incomeText', title: 'Median income' }, { field: 'robberiesText', title: 'Robberies, 2020' }],
        },
      },
      // the largest count is named with a leader up to clear space; every other neighbourhood is in the tooltip and the table
      { transform: [{ filter: `datum.name === ${JSON.stringify(maxName)}` }, { calculate: '66000', as: 'top' }], mark: { type: 'rule', style: 'muted', strokeWidth: 1 }, encoding: { x, y: { field: 'income', type: 'quantitative', scale: y.scale }, y2: { field: 'top' } } },
      { transform: [{ filter: `datum.name === ${JSON.stringify(maxName)}` }, { calculate: '66000', as: 'top' }], mark: { type: 'text', style: 'ink', baseline: 'bottom', dy: -4, fontWeight: 600 }, encoding: { x, y: { field: 'top', type: 'quantitative', scale: y.scale }, text: { field: 'name' } } },
    ],
  }
  return {
    spec,
    table: rows.map((r) => ({ Neighbourhood: r.name, 'Job ratio': r.ratioText, 'Median income (CAD)': r.incomeText, 'Robberies, 2020': r.robberiesText })),
    description:
      'Scatter plot of the neighbourhoods: permanent job to labour force ratio across, median income up, with colour and marker area showing the number of robberies reported in 2020. The largest counts occur at a range of incomes; there is only a weak tendency for lower-income areas to have more.',
  }
}
