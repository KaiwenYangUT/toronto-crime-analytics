import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  barCounts, dailyCounts, dailyCsv, dayNumber, distinctEvents, filterEvents, haversineM, isoDate, isoWeekday,
  nearestStation, periodMask, trendCounts, type DailyRow, type EventTable, type Filter,
  type NamedPoint, type TrendRow,
} from '../src/explore-engine/analysis.ts'
import { parseBundle, verifyBundle, type BundleMeta } from '../src/explore-engine/bundle.ts'
import { asArray, CATEGORIES, hexToDouble, loadEvents, loadFixtures, loadPoints, parseCsv } from './r-fixtures.ts'

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const fmt = (v: number) => (Number.isNaN(v) ? 'NA' : v.toFixed(0))
const canon = (rows: readonly (DailyRow | TrendRow)[], withEligible: boolean) =>
  rows
    .map((r) => [isoDate(r.day), r.category, fmt(r.count), ...(withEligible ? [String((r as TrendRow).eligibleDays)] : [])].join('|'))
    .join('\n')

describe('small pieces', () => {
  it('decodes R hex doubles exactly', () => {
    expect(hexToDouble('0x1p+0')).toBe(1)
    expect(hexToDouble('-0x1.8p+1')).toBe(-3)
    expect(hexToDouble('0x1.999999999999ap-4')).toBe(0.1)
  })

  it('parses quoted CSV fields with commas', () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3\n')).toEqual([['a', 'b, c', 'd "e"'], ['1', '2', '3']])
  })

  it('haversine: zero for coincident points, about 111.2 km per equatorial degree', () => {
    expect(haversineM(-79.4, 43.7, -79.4, 43.7)).toBe(0)
    expect(Math.abs(haversineM(1, 0, 0, 0) - 111195)).toBeLessThan(1)
  })

  it('ISO weekday and day numbers', () => {
    expect(isoWeekday(dayNumber('1970-01-01'))).toBe(4)
    expect(isoWeekday(dayNumber('2023-04-01'))).toBe(6)
    expect(isoDate(dayNumber('2024-02-29'))).toBe('2024-02-29')
  })

  it('period presets match the original rules', () => {
    const d = (s: string) => dayNumber(s)
    expect(['2023-02-01', '2023-03-01', '2023-10-01'].map((s) => periodMask(d(s), 12, 'midterm'))).toEqual([true, false, true])
    expect(['2023-04-01', '2023-05-01', '2023-12-01'].map((s) => periodMask(d(s), 12, 'final'))).toEqual([true, false, true])
    const breaks = ['2023-12-22', '2023-12-23', '2024-01-03', '2024-01-04', '2024-06-01', '2024-08-31', '2024-09-01']
    expect(breaks.map((s) => periodMask(d(s), 12, 'break_time'))).toEqual([false, true, true, false, true, true, false])
    const monday = d('2023-01-02')
    const peak = Array.from({ length: 7 * 24 }, (_, k) => periodMask(monday + Math.floor(k / 24), k % 24, 'peak'))
    expect(peak.filter(Boolean).length).toBe(35)
    expect(peak.every((p, k) => p !== periodMask(monday + Math.floor(k / 24), k % 24, 'off_peak'))).toBe(true)
    expect(periodMask(monday, 19, 'peak')).toBe(false)
  })
})

describe('parity with the R fixtures', () => {
  let events: EventTable
  let ids: string[]
  let places: NamedPoint[]
  let stations: NamedPoint[]
  let fixtures: ReturnType<typeof loadFixtures>

  beforeAll(() => {
    const loaded = loadEvents()
    events = loaded.table
    ids = loaded.ids
    places = loadPoints('places_hex.csv')
    stations = loadPoints('stations_hex.csv')
    fixtures = loadFixtures()
  })

  it('loads the 25,242 events', () => {
    expect(events.n).toBe(25_242)
    expect(Array.from(events.category).every((c) => c < 3)).toBe(true)
  })

  function runAll(table: EventTable, ids: string[] | null): string[] {
    const failures: string[] = []
    for (const c of fixtures.cases) {
      const inp = c.input
      const cats = new Set(asArray(inp.categories ?? []).map((l) => CATEGORIES.indexOf(l)))
      const labels = [...cats].map((i) => CATEGORIES[i])
      const weekdays = asArray(inp.weekdays ?? [])
      const hours = [inp.hours[0], inp.hours[1]] as const
      const from = dayNumber(inp.date_from)
      const to = dayNumber(inp.date_to)
      let center: NamedPoint | undefined
      if (inp.mode === 'destination') center = places.find((p) => p.id === inp.place)
      if (inp.mode === 'station') center = nearestStation(places.find((p) => p.id === inp.place)!, stations)
      if (inp.mode === 'station' && center?.id !== inp.station) failures.push(`${c.id}: nearest station`)
      const filter: Filter = {
        dateFrom: from, dateTo: to, categories: cats, preset: inp.preset, weekdays: new Set(weekdays),
        hours, center, radiusM: inp.radius_m,
      }
      const sel = filterEvents(table, filter)
      const bars = barCounts(table, sel)
      const daily = dailyCounts(table, sel, from, to, labels, inp.preset, filter.weekdays, hours)
      const fail = (what: string) => failures.push(`${c.id}: ${what}`)
      if (sel.length !== c.records) fail(`records ${sel.length} vs ${c.records}`)
      if (distinctEvents(table, sel) !== c.distinct_ids) fail('distinct ids')
      if (ids && sha(Array.from(sel, (i) => ids[i]).join('\n')) !== c.ids_sha256) fail('record order')
      if (bars.byCategory.join() !== c.by_category.join()) fail('by category')
      if (bars.byWeekday.join() !== c.by_weekday.join()) fail('by weekday')
      if (bars.byHour.join() !== c.by_hour.join()) fail('by hour')
      if (daily.length !== c.daily_rows || daily.filter((r) => Number.isNaN(r.count)).length !== c.daily_na) fail('daily shape')
      if (sha(canon(daily, false)) !== c.daily_sha256) fail('daily array')
      if (sha(canon(trendCounts(daily, 'day'), true)) !== c.day_sha256) fail('day trend')
      if (sha(canon(trendCounts(daily, 'week'), true)) !== c.week_sha256) fail('week trend')
      if (sha(canon(trendCounts(daily, 'month'), true)) !== c.month_sha256) fail('month trend')
      const csv = dailyCsv(daily, {
        scope: center ? center.name : null, radiusM: center ? inp.radius_m : null, preset: inp.preset,
        weekdays, hours,
      })
      if (sha(csv) !== c.csv_sha256) fail('csv bytes')
      if (c.debug && csv !== c.debug.csv) fail('csv text')
    }
    return failures
  }

  it('every fixture case matches exactly (table built from R\'s CSV export)', () => {
    expect(runAll(events, ids).slice(0, 10)).toEqual([])
    expect(fixtures.cases.length).toBe(2565)
  }, 120_000)

  it('every fixture case matches exactly on the shipped binary bundle', () => {
    const dir = new URL('../public/data/explore/', import.meta.url)
    const meta = JSON.parse(readFileSync(new URL('meta.json', dir), 'utf8')) as BundleMeta
    const bin = readFileSync(new URL('legacy.bin', dir))
    expect(createHash('sha256').update(bin).digest('hex')).toBe(meta.sha256)
    const bundle = parseBundle(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), meta)
    expect(bundle.table.n).toBe(25_242)
    // the bundle must hold the same records as R's table, coordinates bit for bit
    expect(Array.from(bundle.table.lon).every((v, i) => Object.is(v, events.lon[i]))).toBe(true)
    expect(Array.from(bundle.table.lat).every((v, i) => Object.is(v, events.lat[i]))).toBe(true)
    expect(Array.from(bundle.table.day).every((v, i) => v === events.day[i])).toBe(true)
    expect(runAll(bundle.table, null).slice(0, 10)).toEqual([])
  }, 120_000)

  it('reproduces the published validation counts', () => {
    const meta = fixtures.meta as { validation: Record<string, { records: number; distinct_ids?: number }> }
    const full: Filter = {
      dateFrom: dayNumber('2020-01-01'), dateTo: dayNumber('2023-12-31'), categories: new Set([0, 1, 2]),
      preset: 'all', weekdays: new Set([1, 2, 3, 4, 5, 6, 7]), hours: [0, 23],
    }
    const lc = places.find((p) => p.name === 'Little Canada')!
    const x = filterEvents(events, { ...full, center: lc, radiusM: 300 })
    expect([x.length, distinctEvents(events, x)]).toEqual([566, 563])
    expect(meta.validation.little_canada_300m).toEqual({ records: 566, distinct_ids: 563 })
    const dundas = nearestStation(lc, stations)
    expect(dundas.name).toBe('Dundas Station')
    expect(filterEvents(events, { ...full, center: dundas, radiusM: 300 }).length).toBe(702)
    expect(filterEvents(events, { ...full, categories: new Set([1]) }).length).toBe(8455)
  })

  it('doubles embedded quotes in the CSV like write.csv', () => {
    const csv = dailyCsv([{ day: 0, category: 'A"B', count: 1 }], {
      scope: '5" Spot', radiusM: 300, preset: 'all', weekdays: [1], hours: [0, 23],
    })
    expect(csv.split('\n')[1]).toBe('1970-01-01,"A""B",1,"5"" Spot",300,"all","1","0-23"')
  })

  it('refuses a bundle whose checksum does not match', async () => {
    const dir = new URL('../public/data/explore/', import.meta.url)
    const meta = JSON.parse(readFileSync(new URL('meta.json', dir), 'utf8')) as BundleMeta
    const bin = readFileSync(new URL('legacy.bin', dir))
    const copy = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength)
    await expect(verifyBundle(copy, meta)).resolves.toBeUndefined()
    new Uint8Array(copy)[1000] ^= 1
    await expect(verifyBundle(copy, meta)).rejects.toThrow('checksum')
  })

  it('rejects invalid input like the original', () => {
    const f: Filter = {
      dateFrom: 2, dateTo: 1, categories: new Set([0]), preset: 'all', weekdays: new Set([1]), hours: [0, 23],
    }
    expect(() => filterEvents(events, f)).toThrow('valid date range')
    expect(() => filterEvents(events, { ...f, dateFrom: 1, hours: [5, 4] })).toThrow('valid hour range')
    expect(() => filterEvents(events, { ...f, dateFrom: 1, hours: [Number.NaN, 23] })).toThrow('valid hour range')
    expect(() => filterEvents(events, { ...f, dateFrom: 1, center: { lon: 0, lat: 0 }, radiusM: 0 })).toThrow('spatial')
  })
})
