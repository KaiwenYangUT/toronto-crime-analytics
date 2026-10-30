import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  barCounts, dailyCounts, dayNumber, distinctEvents, filterEvents, nearestStation, trendCounts,
  type DailyRow, type NamedPoint,
} from '../explore-engine/analysis.ts'
import { loadBundle, loadV2, mergeTables, type Bundle } from '../explore-engine/bundle.ts'
import places from '../data/explore-places.json'
import { ALL_CATEGORIES, defaults, fromParams, toParams, V2_CATEGORIES, type ExploreState } from './state.ts'

export const PLACES = places.places as (NamedPoint & { id: string; type: string })[]
export const STATIONS = places.stations as (NamedPoint & { id: string })[]

export type V2Load = { status: 'idle' | 'loading' } | { status: 'error'; message: string } | { status: 'ready'; bundle: Bundle }

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

  const [v2, setV2] = useState<V2Load>({ status: 'idle' })
  const base = useMemo(() => defaults(), [])
  const state = useMemo(
    () => (mounted && load.status === 'ready' ? fromParams(params, base, PLACES.map((p) => p.id), ALL_CATEGORIES) : base),
    [mounted, load.status, params, base],
  )
  const wantsV2 = state.cats.some((c) => V2_CATEGORIES.includes(c))
  useEffect(() => {
    if (!wantsV2 || v2.status !== 'idle') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setV2({ status: 'loading' })
    loadV2(`${import.meta.env.BASE_URL}data/explore`).then(
      (bundle) => setV2({ status: 'ready', bundle }),
      (e: unknown) => setV2({ status: 'error', message: e instanceof Error ? e.message : 'Could not load the additional crime types.' }),
    )
  }, [wantsV2, v2.status])
  const table = useMemo(
    () => (load.status !== 'ready' ? null : v2.status === 'ready' ? mergeTables(load.bundle.table, v2.bundle.table) : load.bundle.table),
    [load, v2],
  )
  const update = (patch: Partial<ExploreState>) => setParams(toParams({ ...state, ...patch }, base), { replace: true, preventScrollReset: true })
  const reset = () => setParams(new URLSearchParams(), { replace: true, preventScrollReset: true })
  const retry = () => {
    if (load.status === 'error') {
      setLoad({ status: 'loading' })
      setAttempt((a) => a + 1)
    }
    if (v2.status === 'error') setV2({ status: 'idle' })
  }

  const derived = useMemo(() => {
    if (load.status !== 'ready' || !table || (wantsV2 && v2.status !== 'ready')) return null
    const { meta } = load.bundle
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
  }, [load, state, table, wantsV2, v2.status])

  return { load, v2, wantsV2, table, state, update, reset, retry, derived, base, ready: mounted && load.status === 'ready' }
}
