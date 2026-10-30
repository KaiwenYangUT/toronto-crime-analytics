import { describe, expect, it } from 'vitest'
import explain from '../src/data/pages/explain.json'
import { formatFor, formatNumber, getValue, numberText, splitKey, type PageResults } from '../src/lib/results.ts'
import { ALL_CATEGORIES, defaults, fromParams, toParams } from '../src/explore/state.ts'

const data = explain as unknown as PageResults

describe('results lookup and display formats', () => {
  it('splits a reference into key and path', () => {
    expect(splitKey('explain.sta303_v2:hour_or_vs_12.15.or')).toEqual({ key: 'explain.sta303_v2', path: ['hour_or_vs_12', '15', 'or'] })
    expect(() => splitKey('no-colon')).toThrow()
  })
  it('rounds only through the stored format', () => {
    const raw = getValue(data, 'explain.sta303_v2:post2019.or') as number
    expect(numberText(data, 'explain.sta303_v2:post2019.or')).toBe(raw.toFixed(2))
    expect(formatFor(data, 'explain.sta303_v2:robbery_share')).toEqual({ decimals: 1, percent: true })
  })
  it('prefers the more specific format pattern', () => {
    expect(formatFor(data, 'explain.sta303_v2:cv.auc_mean')).toEqual({ decimals: 3 })
  })
  it('fails on a missing value or format instead of printing something', () => {
    expect(() => numberText(data, 'explain.sta303_v2:nope.or')).toThrow(/No value/)
    expect(() => getValue(data, 'unknown.key:a')).toThrow(/not loaded/)
  })
  it('formats percentages, grouping, plain years and p-values', () => {
    expect(formatNumber(0.1054547, { decimals: 1, percent: true })).toBe('10.5%')
    expect(formatNumber(159056, { decimals: 0 })).toBe('159,056')
    expect(formatNumber(2020, { decimals: 0, plain: true })).toBe('2020')
    expect(formatNumber(0.0000001, { p: true })).toBe('< 0.001')
  })
  it('never rounds a value up for effect', () => {
    expect(formatNumber(0.5459, { decimals: 2 })).toBe('0.55')
    expect(formatNumber(0.5449, { decimals: 2 })).toBe('0.54')
  })
})

describe('Explore URL state', () => {
  const cats = ALL_CATEGORIES
  const base = defaults()
  it('round-trips a changed state and omits defaults', () => {
    const s = { ...base, mode: 'destination' as const, place: 'site3', radius: 500, cats: ['Robbery', 'Auto theft'], hours: [6, 9] as [number, number], from: '2021-01-01' }
    const p = toParams(s, base)
    expect(p.get('place')).toBe('site3')
    expect(p.has('by')).toBe(false)
    expect(fromParams(p, base, ['site1', 'site3'], cats)).toEqual(s)
  })
  it('keeps the three original categories by default and omits them from the URL', () => {
    expect(base.cats).toEqual(['Bicycle theft', 'Robbery', 'Theft over'])
    expect(toParams(base, base).toString()).toBe('')
  })
  it('ignores values it does not recognise', () => {
    const p = new URLSearchParams('mode=bogus&radius=99999&hours=9-3&from=2021-02-30&cats=Robbery,Nope&by=year')
    const s = fromParams(p, base, ['site1'], cats)
    expect(s.mode).toBe('city')
    expect(s.radius).toBe(300)
    expect(s.hours).toEqual([0, 23])
    expect(s.from).toBe('')
    expect(s.cats).toEqual(['Robbery'])
    expect(s.interval).toBe('week')
  })
})
