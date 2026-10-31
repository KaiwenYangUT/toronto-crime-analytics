// Vega-Lite specs for the Explore charts. Categories keep one colour on every chart and the map.
import type { Spec } from '../lib/chart.ts'
import { isoDate, type TrendRow } from '../explore-engine/analysis.ts'

/** Full-vocabulary order: the theme's categorical range follows this order, so a filter never repaints a category. */
export const CATEGORY_DOMAIN = ['Robbery', 'Auto theft', 'Break and enter', 'Theft over', 'Bicycle theft']

const colorField = (legend: boolean) => ({ field: 'category', type: 'nominal', title: null, scale: { domain: CATEGORY_DOMAIN }, legend: legend ? { orient: 'top' } : null })

export function trendSpec(rows: TrendRow[]): Spec {
  const values = rows.map((r) => ({ date: isoDate(r.day), category: r.category, count: Number.isNaN(r.count) ? null : r.count }))
  return {
    height: 240,
    data: { values },
    params: [{ name: 'brush', select: { type: 'interval', encodings: ['x'] } }],
    mark: { type: 'line', strokeWidth: 2, interpolate: 'linear' },
    encoding: {
      x: { field: 'date', type: 'temporal', title: null },
      y: { field: 'count', type: 'quantitative', title: 'Records' },
      color: colorField(true),
      strokeDash: { field: 'category', type: 'nominal', legend: null, scale: { domain: CATEGORY_DOMAIN, range: [[1, 0], [6, 3], [2, 2], [8, 3, 2, 3], [4, 4]] } },
      tooltip: [{ field: 'date', type: 'temporal' }, { field: 'category' }, { field: 'count', title: 'Records' }],
    },
  }
}

export function categoryBars(categories: string[], counts: number[]): Spec {
  return {
    height: { step: 28 },
    data: { values: categories.map((c, i) => ({ category: c, count: counts[i] })) },
    mark: { type: 'bar' },
    encoding: { y: { field: 'category', type: 'nominal', title: null, axis: { labelLimit: 130 } }, x: { field: 'count', type: 'quantitative', title: 'Records' }, color: colorField(false) },
  }
}

export function weekdayBars(counts: number[]): Spec {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return {
    height: 180,
    data: { values: labels.map((d, i) => ({ day: d, count: counts[i] })) },
    mark: { type: 'bar', style: 'accent' },
    encoding: { x: { field: 'day', type: 'ordinal', sort: labels, title: null, axis: { labelAngle: 0, labelExpr: 'slice(datum.value, 0, 2)' } }, y: { field: 'count', type: 'quantitative', title: 'Records' } },
  }
}

export function hourBars(counts: number[]): Spec {
  return {
    height: 180,
    data: { values: counts.map((c, h) => ({ hour: h, count: c })) },
    mark: { type: 'bar', style: 'accent' },
    encoding: { x: { field: 'hour', type: 'ordinal', title: 'Hour of day', axis: { labelAngle: 0, labelOverlap: true, values: [0, 3, 6, 9, 12, 15, 18, 21] } }, y: { field: 'count', type: 'quantitative', title: 'Records' } },
  }
}
