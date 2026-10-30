// Vega-Lite specs for the Explain, Predict and Overview figures, built from page results.
// Marks take their colours from the theme's named styles (accent, muted, ink), so light and dark
// modes need no per-mode code here. Table cells use the stored display formats.
import { getValue, numberText, type PageResults } from './results.ts'
import type { Spec } from './chart.ts'
import type { TableRow } from '../components/Figure.tsx'

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
export type Metric = 'pr_auc' | 'roc_auc' | 'f1'
export const METRIC_LABEL: Record<Metric, string> = { pr_auc: 'PR-AUC', roc_auc: 'ROC-AUC', f1: 'F1 at the tuned threshold' }

const ABL = 'predict.ablation'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Share of reported property-type incidents that are robberies, by year. */
export function shareByYear(d: PageResults): FigureData {
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
      { transform: [{ filter: "datum.year === '2014' || datum.year === '2023'" }], mark: { type: 'text', style: 'ink', dy: -14, fontWeight: 600, fontSize: 13 }, encoding: { y: { field: 'share', type: 'quantitative' }, text: { field: 'label' } } },
    ],
  }
  return {
    spec,
    table: rows.map((r) => ({ Year: r.year, 'Robbery share': r.label })),
    description: `Line chart of the robbery share of reported property-type incidents from ${years[0]} to ${years[years.length - 1]}, falling from ${rows[0].label} to ${rows[rows.length - 1].label}.`,
  }
}

interface ForestRow {
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

/** Forest plot of the odds ratios of robbery vs other property crime, with cluster-robust 95% intervals. */
export function forestPlot(d: PageResults): FigureData {
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
  const order = rows.map((r) => r.term)
  const y = { field: 'term', type: 'nominal', sort: order, title: null, axis: { labelLimit: 140, ticks: false, domain: false, grid: true } }
  const x = { type: 'quantitative', scale: { type: 'log', domain: [0.35, 3] }, axis: { values: [0.5, 0.75, 1, 1.5, 2, 3], format: '~g', title: 'Odds of robbery vs other property crime (log scale; 1 = no difference)' } }
  const spec: Spec = {
    height: { step: 17 },
    data: { values: rows },
    layer: [
      { data: { values: [{ v: 1 }] }, mark: { type: 'rule', style: 'muted', strokeDash: [4, 4] }, encoding: { x: { field: 'v', ...x } } },
      { mark: { type: 'rule', style: 'muted', strokeWidth: 1.5 }, encoding: { y, x: { field: 'lo', ...x }, x2: { field: 'hi' } } },
      { mark: { type: 'point', style: 'muted', filled: true, size: 36 }, encoding: { y, x: { field: 'or', ...x } } },
      { transform: [{ filter: 'datum.highlight' }], mark: { type: 'rule', style: 'accent', strokeWidth: 3 }, encoding: { y, x: { field: 'lo', ...x }, x2: { field: 'hi' } } },
      { transform: [{ filter: 'datum.highlight' }], mark: { type: 'point', style: 'accent', filled: true, size: 90 }, encoding: { y, x: { field: 'or', ...x } } },
      { transform: [{ filter: 'datum.highlight' }], mark: { type: 'text', style: 'ink', align: 'left', dx: 8, fontWeight: 600, fontSize: 13 }, encoding: { y, x: { field: 'hi', ...x }, text: { field: 'label' } } },
    ],
  }
  const table = rows.map((r) => ({ Group: r.group, Term: r.term, 'Odds ratio': r.label, 'Robust interval low': r.loText, 'Robust interval high': r.hiText }))
  return {
    spec,
    table,
    description:
      'Forest plot with one row for the post-2019 period, darkness, each hour against noon, each month against January and each weekday against Monday. Most hours and several months have intervals that exclude one; most weekdays do not.',
  }
}

type Row = { rung: string; series: string; design: string; premises: string; estimate: number; lo: number; hi: number; text: [string, string, string] }

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
  const common = { xOffset: xo, x: { field: 'rung', type: 'nominal', sort: order, title: null, axis: { labelAngle: 0, labelLimit: 160, labelPadding: 8 } } }
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
    precision.forEach((p, i) => rows.push({ rung: `${rung} ${RUNG_LABEL[rung]}`, recall: recall[i], precision: p, text: [fmt(d, `${base}.recall.${i}`), fmt(d, `${base}.precision.${i}`)] }))
  }
  const order = RUNGS.map((r) => `${r} ${RUNG_LABEL[r]}`)
  const prev = num(d, `${ABL}:designs.${design}.prevalence`)
  const spec: Spec = {
    height: 320,
    data: { values: rows },
    layer: [
      { data: { values: [{ v: prev }] }, mark: { type: 'rule', style: 'muted', strokeDash: [2, 4] }, encoding: { y: { field: 'v', type: 'quantitative' } } },
      { mark: { type: 'line', interpolate: 'step-after' }, encoding: { x: { field: 'recall', type: 'quantitative', title: 'Recall', scale: { domain: [0, 1] } }, y: { field: 'precision', type: 'quantitative', title: 'Precision', scale: { domain: [0, 1] } }, color: { field: 'rung', type: 'ordinal', sort: order, title: null, scale: { domain: order } } } },
    ],
  }
  return {
    spec,
    table: rows.filter((_, i) => i % 10 === 0).map((r) => ({ Rung: r.rung, Recall: r.text[0], Precision: r.text[1] })),
    description: 'Precision against recall for the five model rungs. The curves for the time-only model sit close to the baseline share of robberies; the curves for the other rungs rise well above it.',
  }
}

const BLOCK_LABEL: Record<string, string> = { premises: 'Premises and location type', time: 'Time (hour, month, weekday, darkness)', census: 'Census', geo: 'Geography' }

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
    encoding: { y: { field: 'block', type: 'nominal', sort: '-x', title: null, axis: { labelLimit: 240 } }, x: { field: 'drop', type: 'quantitative', title: 'PR-AUC lost when the block is shuffled', scale: { domain: [0, 0.5] } } },
    layer: [
      { mark: { type: 'bar', style: 'accent', height: { band: 0.6 } } },
      { mark: { type: 'text', style: 'ink', align: 'left', dx: 6, fontWeight: 600 }, encoding: { text: { field: 'label' } } },
    ],
  }
  return {
    spec,
    table: rows.map((r) => ({ Block: r.block, 'PR-AUC lost': r.label })),
    description: 'Horizontal bars: shuffling the premises and location block costs the most PR-AUC, far more than time, census or geography.',
  }
}

/** Robbery share by weekday or hour in the 2020 course data, to check the original captions. */
export function patternChart(d: PageResults, kind: 'weekday' | 'hour'): FigureData {
  const C = 'predict.eda_corrections:claims'
  const rows =
    kind === 'weekday'
      ? WEEKDAYS.map((w) => ({ x: w, share: num(d, `${C}.weekend_peak.robbery_share_by_day.${w}`), label: fmt(d, `${C}.weekend_peak.robbery_share_by_day.${w}`) }))
      : Array.from({ length: 24 }, (_, h) => ({ x: String(h).padStart(2, '0'), share: num(d, `${C}.hourly_shape.robbery_share_by_hour.${h}`), label: fmt(d, `${C}.hourly_shape.robbery_share_by_hour.${h}`) }))
  const spec: Spec = {
    height: 220,
    data: { values: rows },
    mark: { type: 'bar', style: 'accent' },
    encoding: { x: { field: 'x', type: 'ordinal', sort: rows.map((r) => r.x), title: kind === 'hour' ? 'Hour of day' : null, axis: { labelAngle: 0, labelOverlap: true } }, y: { field: 'share', type: 'quantitative', title: 'Robbery share of incidents', axis: { format: '.0%' } }, tooltip: [{ field: 'x' }, { field: 'label', title: 'Share' }] },
  }
  return {
    spec,
    table: rows.map((r) => ({ [kind === 'hour' ? 'Hour' : 'Weekday']: r.x, 'Robbery share': r.label })),
    description: kind === 'hour' ? 'Bars of the robbery share by hour of day; the share jumps between hours rather than following a smooth curve.' : 'Bars of the robbery share by weekday; Saturday is highest and Sunday lowest.',
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
