// Vega-Lite specs for the Explore charts. Categories keep one colour on every chart and the map.
// Every spec has a numeric height and `autosize: fit`, so the height is the whole chart (axes
// included) and the width follows the card. The dashboard computes the heights from the grid.
import type { Spec } from '../lib/chart.ts'
import { isoDate, type TrendRow } from '../explore-engine/analysis.ts'

/** Full-vocabulary order: the theme's categorical range follows this order, so a filter never repaints a category. */
export const CATEGORY_DOMAIN = ['Robbery', 'Auto theft', 'Break and enter', 'Theft over', 'Bicycle theft']

const FIT = { type: 'fit', contains: 'padding' }
const colorField = { field: 'category', type: 'nominal', title: null, scale: { domain: CATEGORY_DOMAIN }, legend: null }

/**
 * Lines per crime type over the full date range. The legend is the "By crime type" card below
 * (same colours, labelled bars) and the map legend; dashes keep the lines apart without colour.
 * `range` shades the dates currently applied, so a committed brush stays visible.
 */
export function trendSpec(rows: TrendRow[], height: number, range?: { from: string; to: string }): Spec {
  const values = rows.map((r) => ({ date: isoDate(r.day), category: r.category, count: Number.isNaN(r.count) ? null : r.count }))
  const x = { field: 'date', type: 'temporal', title: null, scale: { type: 'utc' }, axis: { tickCount: 5, labelOverlap: true } }
  const line = {
    mark: { type: 'line', strokeWidth: 2, interpolate: 'linear' },
    params: [{ name: 'brush', select: { type: 'interval', encodings: ['x'] } }],
    encoding: {
      x,
      y: { field: 'count', type: 'quantitative', title: 'Records', axis: { tickCount: 3 } },
      color: colorField,
      strokeDash: { field: 'category', type: 'nominal', legend: null, scale: { domain: CATEGORY_DOMAIN, range: [[1, 0], [6, 3], [2, 2], [8, 3, 2, 3], [4, 4]] } },
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
  return { height, autosize: FIT, data: { values }, layer: [...band, line] }
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
