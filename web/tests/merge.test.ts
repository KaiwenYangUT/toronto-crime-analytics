import { describe, expect, it } from 'vitest'
import { barCounts, distinctEvents, filterEvents, type EventTable } from '../src/explore-engine/analysis.ts'
import { mergeTables } from '../src/explore-engine/bundle.ts'

function table(categories: string[], rows: { day: number; hour: number; weekday: number; cat: number; lon: number; lat: number; cls: number }[]): EventTable {
  return {
    n: rows.length,
    day: Int32Array.from(rows.map((r) => r.day)),
    hour: Uint8Array.from(rows.map((r) => r.hour)),
    weekday: Uint8Array.from(rows.map((r) => r.weekday)),
    category: Uint8Array.from(rows.map((r) => r.cat)),
    lon: Float64Array.from(rows.map((r) => r.lon)),
    lat: Float64Array.from(rows.map((r) => r.lat)),
    eventClass: Uint32Array.from(rows.map((r) => r.cls)),
    categories,
  }
}

describe('merging the v2 table', () => {
  const a = table(['Robbery'], [{ day: 18262, hour: 1, weekday: 3, cat: 0, lon: -79.4, lat: 43.7, cls: 7 }])
  const b = table(['Auto theft'], [
    { day: 18263, hour: 2, weekday: 4, cat: 0, lon: -79.4, lat: 43.7, cls: 7 },
    { day: 18264, hour: 3, weekday: 5, cat: 0, lon: -79.5, lat: 43.6, cls: 9 },
  ])
  const m = mergeTables(a, b)
  it('appends the categories and shifts the new codes', () => {
    expect(m.categories).toEqual(['Robbery', 'Auto theft'])
    expect(Array.from(m.category)).toEqual([0, 1, 1])
    expect(m.n).toBe(3)
  })
  it('counts records and distinct event IDs across both parts', () => {
    const all = filterEvents(m, { dateFrom: 0, dateTo: 30000, categories: new Set([0, 1]), preset: 'all', weekdays: new Set([1, 2, 3, 4, 5, 6, 7]), hours: [0, 23] })
    expect(all.length).toBe(3)
    expect(distinctEvents(m, all)).toBe(2)
    expect(barCounts(m, all).byCategory).toEqual([1, 2])
  })
})
