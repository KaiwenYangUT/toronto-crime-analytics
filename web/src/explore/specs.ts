// Vega-Lite specs for the Explore charts. Categories keep one colour on every chart and the map.
// Every spec has a numeric height and `autosize: fit`, so the height is the whole chart (axes
// included) and the width follows the card. The dashboard computes the heights from the grid.
import type { Spec } from '../lib/chart.ts'
import { isoDate, type TrendRow } from '../explore-engine/analysis.ts'

/** Full-vocabulary order: the theme's categorical range follows this order, so a filter never repaints a category. */
export const CATEGORY_DOMAIN = ['Robbery', 'Auto theft', 'Break and enter', 'Theft over', 'Bicycle theft']

const FIT = { type: 'fit', contains: 'padding' }

/** Dash per crime type (solid, then four patterns that differ in segment length, not only in gap), same order as CATEGORY_DOMAIN. */
const DASHES = [[1, 0], [9, 4], [5, 5], [11, 3, 2, 3], [2, 3]]
const END_LABEL: Record<string, string> = { 'Break and enter': 'Break & enter' }
const LABEL_GAP_PX = 15
const niceCeil = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1)))
  const f = v / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}

/** The last value of each series, as a label position pushed apart so neighbouring end labels never overlap. */
function endLabels(values: { date: string; category: string; count: number | null }[], yMax: number, plotH: number) {
  // anchor each label at the last date, at the mean of the last four points so one noisy day does not decide the order
  const by = new Map<string, { date: string; count: number }[]>()
  for (const v of values) if (v.count !== null) by.set(v.category, [...(by.get(v.category) ?? []), { date: v.date, count: v.count }])
  const ends = [...by.entries()]
    .map(([category, pts]) => {
      const tail = pts.sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-4)
      return { date: tail[tail.length - 1].date, category, count: tail.reduce((s, x) => s + x.count, 0) / tail.length }
    })
    .sort((a, b) => b.count - a.count)
  const gap = (LABEL_GAP_PX * yMax) / Math.max(plotH, 1)
  const placed: { date: string; category: string; label: string; ly: number }[] = []
  for (const e of ends) {
    const above = placed.length ? placed[placed.length - 1].ly - gap : Infinity
    placed.push({ date: e.date, category: e.category, label: END_LABEL[e.category] ?? e.category, ly: Math.min(e.count, above) })
  }
  // keep the lowest label inside the plot
  const floor = gap / 2
  for (let i = placed.length - 1, min = floor; i >= 0; i--, min += gap) placed[i].ly = Math.max(placed[i].ly, min)
  return placed
}
const colorField = { field: 'category', type: 'nominal', title: null, scale: { domain: CATEGORY_DOMAIN }, legend: null }

/**
 * Lines per crime type over the full date range. Each line is named at its end (direct labels, in ink), the
 * "By crime type" card below repeats the colours, and distinct dash patterns keep the lines apart without colour.
 * `range` shades the dates currently applied, so a committed brush stays visible.
 */
export function trendSpec(rows: TrendRow[], height: number, range?: { from: string; to: string }): Spec {
  const values = rows.map((r) => ({ date: isoDate(r.day), category: r.category, count: Number.isNaN(r.count) ? null : r.count }))
  const x = { field: 'date', type: 'temporal', title: null, scale: { type: 'utc' }, axis: { tickCount: 5, labelOverlap: true } }
  const yMax = niceCeil(Math.max(1, ...values.map((v) => v.count ?? 0)))
  const ends = endLabels(values, yMax, height - 34)

  const line = {
    mark: { type: 'line', strokeWidth: 2, interpolate: 'linear' },
    params: [{ name: 'brush', select: { type: 'interval', encodings: ['x'] } }],
    encoding: {
      x,
      y: { field: 'count', type: 'quantitative', title: 'Records', axis: { tickCount: 3 }, scale: { domain: [0, yMax], nice: false } },
      color: colorField,
      strokeDash: { field: 'category', type: 'nominal', legend: null, scale: { domain: CATEGORY_DOMAIN, range: DASHES } },
      tooltip: [{ field: 'date', type: 'temporal', title: 'Date' }, { field: 'category', title: 'Crime type' }, { field: 'count', title: 'Records' }],
    },
  }
  const band = range
    ? [{
        data: { values: [{ a: range.from, b: range.to }] },
        mark: { type: 'rect', style: 'accent', opacity: 0.14 },
        encoding: { x: { field: 'a', type: 'temporal', scale: { type: 'utc' } }, x2: { field: 'b' }, y: { value: 0 }, y2: { value: { expr: 'height' } } },
      }]
    : []
  // End labels in ink with a small series-coloured dot; `autosize: fit` reserves the room they need at the right.
  const at = { x: { field: 'date', type: 'temporal', scale: { type: 'utc' } }, y: { field: 'ly', type: 'quantitative', scale: { domain: [0, yMax], nice: false } } }
  const labels = [
    { data: { values: ends }, mark: { type: 'point', filled: true, shape: 'circle', size: 48, opacity: 1 }, encoding: { ...at, xOffset: { value: 8 }, color: colorField } },
    { data: { values: ends }, mark: { type: 'text', align: 'left', baseline: 'middle', dx: 16, style: 'ink' }, encoding: { ...at, text: { field: 'label' } } },
  ]
  return { height, autosize: FIT, padding: { left: 4, top: 4, bottom: 4, right: 4 }, data: { values }, layer: [...band, line, ...labels] }
}

/** Horizontal bars with the count written at the end of each bar, so there is no value axis to read. */
export function categoryBars(categories: string[], counts: number[], height: number): Spec {
  const max = Math.max(1, ...counts)
  return {
    height,
    autosize: FIT,
    data: { values: categories.map((c, i) => ({ category: c, count: counts[i] })) },
    encoding: {
      y: { field: 'category', type: 'nominal', sort: '-x', title: null, axis: { labelLimit: 140, ticks: false, domain: false } },
      x: { field: 'count', type: 'quantitative', title: null, axis: null, scale: { domain: [0, max * 1.28] } },
    },
    layer: [
      { mark: { type: 'bar' }, encoding: { color: colorField } },
      { mark: { type: 'text', align: 'left', dx: 5, style: 'ink' }, encoding: { text: { field: 'count', type: 'quantitative', format: ',' } } },
    ],
  }
}

export function weekdayBars(counts: number[], height: number): Spec {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return {
    height,
    autosize: FIT,
    data: { values: labels.map((d, i) => ({ day: d, count: counts[i] })) },
    mark: { type: 'bar', style: 'accent' },
    encoding: {
      x: { field: 'day', type: 'ordinal', sort: labels, title: null, axis: { labelAngle: 0, ticks: false } },
      y: { field: 'count', type: 'quantitative', title: 'Records', axis: { tickCount: 3 } },
      tooltip: [{ field: 'day', title: 'Weekday' }, { field: 'count', title: 'Records' }],
    },
  }
}

/** Hour bars; the busiest hour is drawn in the ink colour so the evening peak reads at a glance. */
export function hourBars(counts: number[], height: number): Spec {
  const peak = counts.indexOf(Math.max(...counts))
  return {
    height,
    autosize: FIT,
    data: { values: counts.map((c, h) => ({ hour: h, count: c, peak: h === peak && c > 0 })) },
    mark: { type: 'bar', style: 'accent' },
    encoding: {
      x: { field: 'hour', type: 'ordinal', title: null, axis: { labelAngle: 0, ticks: false, values: [0, 6, 12, 18], labelExpr: "datum.value + ':00'" } },
      y: { field: 'count', type: 'quantitative', title: 'Records', axis: { tickCount: 3 } },
      opacity: { condition: { test: 'datum.peak', value: 1 }, value: 0.7 },
      tooltip: [{ field: 'hour', title: 'Hour (starting)' }, { field: 'count', title: 'Records' }],
    },
  }
}
