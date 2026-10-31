// Vega-Lite specs for the paper's four figures. They reuse the site's row builders and the same theme
// (design/vega-theme.json); only sizes differ, because the paper prints them at about 70% scale.
// tools/gen_paper.py renders them to PDF with vl-convert.
import { getValue, numberText, type PageResults } from './results.ts'
import type { Spec } from './chart.ts'
import { ABL, DESIGN_A, DESIGN_B, RUNGS, RUNG_LABEL, ablationRows, forestRows, shareByYear, type ForestRow } from './specs.ts'

const num = (d: PageResults, k: string) => getValue(d, k) as number
const fmt = (d: PageResults, k: string) => numberText(d, k)

const CATEGORIES = ['Robbery', 'Auto Theft', 'Break and Enter', 'Theft Over'] as const

/** Fig 1: incidents per year by crime type, next to the robbery share. */
export function paperFig1(d: PageResults): Spec {
  const K = 'explain.sta303_v2:category_by_year'
  const years = Object.keys(getValue(d, K) as object)
  const rows = years.flatMap((year) =>
    CATEGORIES.map((category) => ({ year, category, n: num(d, `${K}.${year}.${category}`) })),
  )
  const counts: Spec = {
    width: 300,
    height: 210,
    data: { values: rows },
    mark: { type: 'line', point: { filled: true, size: 40 }, strokeWidth: 2 },
    encoding: {
      x: { field: 'year', type: 'ordinal', title: null, axis: { labelAngle: 0, labelOverlap: 'parity' } },
      y: { field: 'n', type: 'quantitative', title: 'Incidents per year', axis: { format: ',d' } },
      color: { field: 'category', type: 'nominal', title: null, scale: { domain: [...CATEGORIES] } },
      shape: { field: 'category', type: 'nominal', title: null, scale: { domain: [...CATEGORIES], range: ['circle', 'square', 'triangle-up', 'diamond'] } },
    },
  }
  const base = shareByYear(d).spec as { encoding: { x: { axis: object } } }
  const share = { ...base, width: 250, height: 210, encoding: { x: { ...base.encoding.x, axis: { labelAngle: 0, labelOverlap: 'parity' } } } }
  return { hconcat: [counts, share], spacing: 24 }
}

const FOREST_X = { type: 'quantitative', scale: { type: 'log', domain: [0.35, 3] }, axis: { values: [0.5, 1, 2], format: '~g', title: 'Odds ratio (log scale; 1 = no difference)' } }

function forestPanel(rows: ForestRow[], title: string, strip: RegExp, width: number): Spec {
  const shown = rows.map((r) => ({ ...r, term: r.term.replace(strip, '') }))
  const y = { field: 'term', type: 'nominal', sort: shown.map((r) => r.term), title: null, axis: { labelLimit: 150, ticks: false, domain: false, grid: true } }
  const x = FOREST_X
  return {
    title: { text: title, fontSize: 13, anchor: 'start' },
    width,
    height: { step: 13 },
    data: { values: shown },
    layer: [
      { data: { values: [{ v: 1 }] }, mark: { type: 'rule', style: 'muted', strokeDash: [4, 4] }, encoding: { x: { field: 'v', ...x } } },
      { mark: { type: 'rule', style: 'muted', strokeWidth: 1.5 }, encoding: { y, x: { field: 'lo', ...x }, x2: { field: 'hi' } } },
      { mark: { type: 'point', style: 'muted', filled: true, size: 30 }, encoding: { y, x: { field: 'or', ...x } } },
      { transform: [{ filter: 'datum.highlight' }], mark: { type: 'rule', style: 'accent', strokeWidth: 3 }, encoding: { y, x: { field: 'lo', ...x }, x2: { field: 'hi' } } },
      { transform: [{ filter: 'datum.highlight' }], mark: { type: 'point', style: 'accent', filled: true, size: 70 }, encoding: { y, x: { field: 'or', ...x } } },
      { transform: [{ filter: 'datum.highlight' }], mark: { type: 'text', style: 'ink', align: 'left', dx: 7, fontWeight: 600, fontSize: 12 }, encoding: { y, x: { field: 'hi', ...x }, text: { field: 'label' } } },
    ],
  }
}

/** Fig 2: the forest plot split into two panels (hours; period, darkness, month and weekday) to fit the page. */
export function paperFig2(d: PageResults): Spec {
  const rows = forestRows(d)
  const hours = rows.filter((r) => r.group.startsWith('Hour'))
  const rest = rows.filter((r) => !r.group.startsWith('Hour'))
  return {
    hconcat: [
      forestPanel(hours, 'Hour of day (vs 12:00)', /^Hour /, 260),
      forestPanel(rest, 'Period, darkness, month (vs January), weekday (vs Monday)', /^(Month|Weekday) /, 260),
    ],
    spacing: 28,
  }
}

const PANEL_WIDTH = 300

/** Fig 3: PR-AUC of the five rungs, one panel per evaluation design; hollow diamonds drop premises and location type. */
export function paperFig3(d: PageResults): Spec {
  const rows = ablationRows(d, 'pr_auc')
  const order = RUNGS.map((r) => `${r} ${RUNG_LABEL[r]}`)
  const WITH = 'With premises'
  const WITHOUT = 'Without premises'
  const y = { type: 'quantitative', title: 'PR-AUC', scale: { domain: [0, 0.75] } }
  const panel = (design: string, title: string, key: string): Spec => {
    const prevalence = num(d, `${ABL}:designs.${key}.prevalence`)
    const values = rows
      .filter((r) => r.design === design)
      .map((r) => ({ ...r, kind: r.withPremises ? WITH : WITHOUT }))
    const common = {
      x: { field: 'rung', type: 'nominal', sort: order, title: null, axis: { labelAngle: 0, labelPadding: 6, labelExpr: "split(datum.value, ' ')[0]" } },
      xOffset: { field: 'kind', type: 'nominal', sort: [WITH, WITHOUT] },
    }
    return {
      title: { text: title, fontSize: 13, anchor: 'start' },
      width: PANEL_WIDTH,
      height: 230,
      data: { values },
      layer: [
        { data: { values: [{ v: prevalence }] }, mark: { type: 'rule', style: 'muted', strokeDash: [2, 4] }, encoding: { y: { field: 'v', ...y } } },
        { data: { values: [{ v: prevalence, t: `Share of robberies: ${fmt(d, `${ABL}:designs.${key}.prevalence`)}` }] }, mark: { type: 'text', style: 'muted', align: 'right', baseline: 'top', dy: 4, fontSize: 11, x: PANEL_WIDTH - 4 }, encoding: { y: { field: 'v', ...y }, text: { field: 't' } } },
        { mark: { type: 'rule', style: 'accent', strokeWidth: 2 }, encoding: { ...common, y: { field: 'lo', ...y }, y2: { field: 'hi' } } },
        {
          mark: { type: 'point', style: 'accent', size: 60, strokeWidth: 2, filled: true },
          encoding: {
            ...common,
            y: { field: 'estimate', ...y },
            shape: { field: 'kind', type: 'nominal', title: null, sort: [WITH, WITHOUT], scale: { domain: [WITH, WITHOUT], range: ['circle', 'diamond'] }, legend: { orient: 'top' } },
          },
        },
      ],
    }
  }
  return {
    hconcat: [
      panel('Grouped CV', 'Neighbourhood-grouped five-fold CV', DESIGN_A),
      panel('Temporal holdout', 'Temporal holdout: train to 2021, test 2022 to 2023', DESIGN_B),
    ],
    spacing: 24,
    resolve: { scale: { shape: 'shared' } },
  }
}

const TIME_BLOCKS: [string, string][] = [
  ['hour', 'Hour'],
  ['month', 'Month'],
  ['weekday', 'Weekday'],
  ['darkness', 'After dark'],
  ['post2019', 'Post-2019'],
]
const IMPORTANCE_BLOCKS: [string, string][] = [
  ['premises', 'Premises and location type'],
  ['time', 'Time'],
  ['census', 'Census'],
  ['geo', 'Geography'],
]

/** Fig 4: how many time terms are statistically clear, next to how much the time block matters for prediction. */
export function paperFig4(d: PageResults): Spec {
  const I = 'predict.inference_vs_prediction:inference'
  const inf = TIME_BLOCKS.map(([k, label]) => ({
    label,
    share: num(d, `${I}.${k}.clear`) / num(d, `${I}.${k}.terms`),
    text: `${fmt(d, `${I}.${k}.clear`)} of ${fmt(d, `${I}.${k}.terms`)}`,
  }))
  const P = `predict.ablation:designs.${DESIGN_A}.variants.L5.block_permutation_importance_pr_auc_drop`
  const imp = IMPORTANCE_BLOCKS.map(([k, label]) => ({ label, drop: num(d, `${P}.${k}`), text: fmt(d, `${P}.${k}`) }))
  const left: Spec = {
    title: { text: 'Inference: clear time terms', fontSize: 13, anchor: 'start' },
    width: 200,
    height: { step: 26 },
    data: { values: inf },
    encoding: { y: { field: 'label', type: 'nominal', sort: inf.map((r) => r.label), title: null, axis: { labelLimit: 150 } }, x: { field: 'share', type: 'quantitative', title: 'Share of terms', scale: { domain: [0, 1.25] }, axis: { format: '.0%', values: [0, 0.5, 1] } } },
    layer: [
      { mark: { type: 'bar', style: 'accent', height: { band: 0.6 } } },
      { mark: { type: 'text', style: 'ink', align: 'left', dx: 5, fontWeight: 600, fontSize: 12 }, encoding: { text: { field: 'text' } } },
    ],
  }
  const right: Spec = {
    title: { text: 'Prediction: PR-AUC lost on shuffling', fontSize: 13, anchor: 'start' },
    width: 200,
    height: { step: 26 },
    data: { values: imp },
    encoding: { y: { field: 'label', type: 'nominal', sort: imp.map((r) => r.label), title: null, axis: { labelLimit: 170 } }, x: { field: 'drop', type: 'quantitative', title: 'PR-AUC lost', scale: { domain: [0, 0.55] }, axis: { values: [0, 0.1, 0.2, 0.3, 0.4, 0.5] } } },
    layer: [
      { mark: { type: 'bar', style: 'accent', height: { band: 0.6 } } },
      { mark: { type: 'text', style: 'ink', align: 'left', dx: 5, fontWeight: 600, fontSize: 12 }, encoding: { text: { field: 'text' } } },
    ],
  }
  return { hconcat: [left, right], spacing: 28 }
}

export const PAPER_FIGURES = { fig1: paperFig1, fig2: paperFig2, fig3: paperFig3, fig4: paperFig4 }
