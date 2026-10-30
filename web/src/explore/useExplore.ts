import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  barCounts, dailyCounts, dayNumber, distinctEvents, filterEvents, nearestStation, trendCounts,
  type DailyRow, type NamedPoint,
} from '../explore-engine/analysis.ts'
import { loadBundle, type Bundle } from '../explore-engine/bundle.ts'
import places from '../data/explore-places.json'
import { defaults, fromParams, toParams, type ExploreState } from './state.ts'

export const PLACES = places.places as (NamedPoint & { id: string; type: string })[]
export const STATIONS = places.stations as (NamedPoint & { id: string })[]

export type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; bundle: Bundle }

export function useExplore() {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [params, setParams] = useSearchParams()
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    let cancelled = false
    loadBundle(`${import.meta.env.BASE_URL}data/explore`).then(
      (bundle) => !cancelled && setLoad({ status: 'ready', bundle }),
      (e: unknown) => !cancelled && setLoad({ status: 'error', message: e instanceof Error ? e.message : 'Could not load the data.' }),
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const categories = useMemo(() => (load.status === 'ready' ? load.bundle.table.categories : []), [load])
  const base = useMemo(() => defaults(categories), [categories])
  const state = useMemo(
    () => (mounted && load.status === 'ready' ? fromParams(params, base, PLACES.map((p) => p.id), categories) : base),
    [mounted, load.status, params, base, categories],
  )
  const update = (patch: Partial<ExploreState>) => setParams(toParams({ ...state, ...patch }, base), { replace: true, preventScrollReset: true })
  const reset = () => setParams(new URLSearchParams(), { replace: true, preventScrollReset: true })
  const retry = () => {
    setLoad({ status: 'loading' })
    setAttempt((a) => a + 1)
  }

  const derived = useMemo(() => {
    if (load.status !== 'ready') return null
    const { table, meta } = load.bundle
    const dateFrom = state.from ? dayNumber(state.from) : meta.first_day
    const dateTo = state.to ? dayNumber(state.to) : meta.last_day
    const site = PLACES.find((p) => p.id === state.place) ?? PLACES[0]
    const center = state.mode === 'city' ? undefined : state.mode === 'station' ? nearestStation(site, STATIONS) : site
    const cats = new Set(table.categories.map((c, i) => (state.cats.includes(c) ? i : -1)).filter((i) => i >= 0))
    const weekdays = new Set(state.weekdays)
    try {
      const selected = filterEvents(table, { dateFrom, dateTo, categories: cats, preset: state.preset, weekdays, hours: state.hours, center, radiusM: center ? state.radius : undefined })
      const labels = table.categories.filter((c) => state.cats.includes(c))
      const daily: DailyRow[] = dailyCounts(table, selected, dateFrom, dateTo, labels, state.preset, weekdays, state.hours)
      return {
        error: null as string | null, dateFrom, dateTo, site, center, selected, daily,
        trend: trendCounts(daily, state.interval),
        bars: barCounts(table, selected),
        records: selected.length,
        distinct: distinctEvents(table, selected),
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Invalid filters', dateFrom, dateTo, site, center, selected: new Int32Array(), daily: [] as DailyRow[], trend: [], bars: barCounts(table, new Int32Array()), records: 0, distinct: 0 }
    }
  }, [load, state])

  return { load, state, update, reset, retry, derived, base, ready: mounted && load.status === 'ready' }
}
