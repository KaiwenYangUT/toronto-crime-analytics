import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { Segmented } from '../components/Segmented.tsx'
import { dailyCsv, haversineM, isoDate, type EventTable, type Interval } from '../explore-engine/analysis.ts'
import { ChartCard } from './ChartCard.tsx'
import { FilterPanel } from './FilterPanel.tsx'
import { MapView } from './MapView.tsx'
import { categoryBars, hourBars, trendSpec, weekdayBars } from './specs.ts'
import { activeFilters, ALL_CATEGORIES, CLUSTER_STEPS, PRESETS, WEEKDAY_LABELS } from './state.ts'
import { STATIONS, useExplore } from './useExplore.ts'
import ui from '../components/ui.module.css'
import s from './explore.module.css'

const CSS_NAME: Record<string, string> = { Robbery: 'robbery', 'Auto theft': 'auto-theft', 'Break and enter': 'break-enter', 'Theft over': 'theft-over', 'Bicycle theft': 'bicycle-theft' }

function useCategoryColors(categories: string[]): Record<string, string> {
  const [colors, setColors] = useState<Record<string, string>>({})
  useEffect(() => {
    const read = () =>
      setColors(Object.fromEntries(categories.map((c) => [c, getComputedStyle(document.documentElement).getPropertyValue(`--cat-${CSS_NAME[c]}`).trim()])))
    read()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', read)
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', read)
      obs.disconnect()
    }
  }, [categories])
  return colors
}

const n = (v: number) => v.toLocaleString('en-CA')
const MS_PER_DAY = 86_400_000
/** "Downtown" in the headline: records within this distance of Union Station. */
const DOWNTOWN_KM = 3
/** "Late afternoon to evening": hours 15 to 21, that is 15:00 to 21:59. */
const EVENING: [number, number] = [15, 21]
const NO_ROWS = new Int32Array()

interface Heights { trend: number; type: number; when: number }
/** Used before the grid is measured and under 1024 px, where the charts stack and the page scrolls. */
const STACKED: Heights = { trend: 220, type: 140, when: 190 }
/** Vertical space in the charts column that is not chart: card padding, header rows, the trend footnote, gaps. */
const CHROME = 248

/** Chart heights follow the charts column, so three cards fill it exactly without a scrollbar. */
function useCardHeights(column: RefObject<HTMLDivElement | null>, bars: number): Heights {
  const [h, setH] = useState<Heights>(STACKED)
  useEffect(() => {
    const el = column.current
    if (!el) return
    let timer = 0
    const measure = () => {
      const total = el.clientHeight
      // display: contents (stacked layout) has no box of its own
      const next: Heights = total < 200
        ? STACKED
        : (() => {
            const avail = total - CHROME
            const trend = Math.max(120, Math.round(avail * 0.4))
            const type = Math.max(80, Math.round(avail * 0.24), bars * 22 + 8)
            return { trend, type, when: Math.max(110, avail - trend - type) }
          })()
      setH((p) => (p.trend === next.trend && p.type === next.type && p.when === next.when ? p : next))
    }
    const later = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(measure, 120)
    }
    measure()
    const ro = new ResizeObserver(later)
    ro.observe(el)
    return () => {
      window.clearTimeout(timer)
      ro.disconnect()
    }
  }, [column, bars])
  return h
}

/** Records within DOWNTOWN_KM of Union Station, overall and for each crime type in the selection. */
function downtownShare(t: EventTable, selected: Int32Array) {
  const u = STATIONS.find((x) => x.name === 'Union Station')
  if (!u || !selected.length) return null
  const inside = new Array<number>(t.categories.length).fill(0)
  const total = new Array<number>(t.categories.length).fill(0)
  for (let k = 0; k < selected.length; k++) {
    const i = selected[k]
    const c = t.category[i]
    total[c]++
    if (haversineM(t.lon[i], t.lat[i], u.lon, u.lat) <= DOWNTOWN_KM * 1000) inside[c]++
  }
  const byType = t.categories
    .map((name, c) => ({ name, inside: inside[c], total: total[c] }))
    .filter((r) => r.total > 0)
  return { inside: inside.reduce((a, b) => a + b, 0), total: selected.length, byType }
}

const pct = (a: number, b: number) => `${((100 * a) / b).toFixed(1)}%`

/** Share of the records reported in the evening hours, with the share an even spread over the same hours would give. */
function eveningShare(byHour: number[], hours: [number, number]) {
  const total = byHour.reduce((a, b) => a + b, 0)
  const lo = Math.max(EVENING[0], hours[0])
  const hi = Math.min(EVENING[1], hours[1])
  const window = hours[1] - hours[0] + 1
  const inside = hi - lo + 1
  if (!total || inside <= 0 || inside >= window) return null
  let count = 0
  for (let h = lo; h <= hi; h++) count += byHour[h]
  return { count, total, even: inside / window }
}

const UNION = STATIONS.find((x) => x.name === 'Union Station')

type When = 'hour' | 'weekday'

/** The map's cluster colours (see CLUSTER_STEPS) with the sizes the map draws them at, for the colour key. */
const CLUSTER_KEY = [
  { label: `under ${n(CLUSTER_STEPS[0])}`, density: 2, size: 12 },
  { label: `${n(CLUSTER_STEPS[0])}–${n(CLUSTER_STEPS[1] - 1)}`, density: 3, size: 15 },
  { label: `${n(CLUSTER_STEPS[1])}–${n(CLUSTER_STEPS[2] - 1)}`, density: 4, size: 18 },
  { label: `${n(CLUSTER_STEPS[2])}+`, density: 5, size: 22 },
]

export function Explore() {
  const x = useExplore()
  const { load, state, update, reset, derived, table, v2, wantsV2, base } = x
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState(false)
  const [when, setWhen] = useState<When>('hour')
  const trigger = useRef<HTMLButtonElement>(null)
  const column = useRef<HTMLDivElement>(null)
  const categories = ALL_CATEGORIES
  const colors = useCategoryColors(categories)
  const meta = load.status === 'ready' ? load.bundle.meta : null
  const dateMin = meta ? isoDate(meta.first_day) : ''
  const dateMax = meta ? isoDate(meta.last_day) : ''
  const active = activeFilters(state, base)
  const shown = useMemo(() => categories.filter((c) => state.cats.includes(c)), [categories, state.cats])
  const heights = useCardHeights(column, shown.length)

  const closeDrawer = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  // The drawer only exists below 1280 px; widening the window closes it.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const onChange = () => mq.matches && setOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const summary = useMemo(() => {
    if (!derived) return ''
    const where = state.mode === 'city' ? 'Citywide' : `${state.radius} m around ${state.mode === 'station' ? (derived.center?.name ?? '') : derived.site.name}`
    const what = state.cats.length === ALL_CATEGORIES.length ? 'all crime types' : state.cats.join(', ') || 'no crime type'
    const time = PRESETS.find((p) => p.value === state.preset)?.label ?? ''
    return `${where} · ${what} · ${isoDate(derived.dateFrom)} to ${isoDate(derived.dateTo)} · ${time.toLowerCase()} · ${state.weekdays.length === 7 ? 'every weekday' : state.weekdays.map((d) => WEEKDAY_LABELS[d - 1]).join(', ') || 'no weekday'} · hours ${state.hours[0]} to ${state.hours[1]}`
  }, [derived, state])

  const ranged = Boolean(state.from || state.to)
  const barRows = useMemo(() => {
    if (!derived || !table) return null
    const idx = table.categories.map((c, i) => (state.cats.includes(c) ? i : -1)).filter((i) => i >= 0)
    return { names: idx.map((i) => table.categories[i]), counts: idx.map((i) => derived.bars.byCategory[i]) }
  }, [derived, table, state.cats])

  const charts = useMemo(() => {
    if (!derived || !barRows) return null
    return {
      trend: trendSpec(derived.trend, heights.trend, ranged ? { from: isoDate(derived.dateFrom), to: isoDate(derived.dateTo) } : undefined),
      category: categoryBars(barRows.names, barRows.counts, heights.type),
      weekday: weekdayBars(derived.bars.byWeekday, heights.when),
      hour: hourBars(derived.bars.byHour, heights.when),
    }
  }, [derived, barRows, heights, ranged])

  const facts = useMemo(() => {
    if (!details || !derived || !table) return null
    const byHour = derived.bars.byHour
    const peak = Math.max(...byHour)
    return {
      hour: peak > 0 ? byHour.indexOf(peak) : null,
      downtown: state.mode === 'city' ? downtownShare(table, derived.selected) : null,
      evening: eveningShare(byHour, state.hours),
    }
  }, [details, derived, table, state.mode, state.hours])

  const csv = () => {
    if (!derived) return
    const body = dailyCsv(derived.daily, { scope: state.mode === 'city' ? null : (derived.center?.name ?? null), radiusM: state.mode === 'city' ? null : state.radius, preset: state.preset, weekdays: state.weekdays, hours: state.hours })
    const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'daily_counts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // The brush is applied when the pointer is released, not on every signal while dragging.
  const pending = useRef<[number, number] | null>(null)
  const applyBrush = useRef<(d: [number, number]) => void>(() => undefined)
  useEffect(() => {
    applyBrush.current = (d) => {
      const from = isoDate(Math.floor(d[0] / MS_PER_DAY))
      const to = isoDate(Math.floor(d[1] / MS_PER_DAY))
      if (from > to) return
      update({ from: from <= dateMin ? '' : from, to: to >= dateMax ? '' : to })
    }
  })
  useEffect(() => {
    let timer = 0
    const release = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const d = pending.current
        pending.current = null
        if (d) applyBrush.current(d)
      }, 30)
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
  }, [])
  const onBrush = (v: unknown) => {
    const d = (v as { date?: [number, number] } | null)?.date
    pending.current = d && d.length === 2 && d[1] > d[0] ? [d[0], d[1]] : null
  }

  const ready = derived && table && charts && barRows
  const modeLabel = state.mode === 'city' ? 'Citywide' : state.mode === 'destination' ? 'Near a destination' : 'Near a station'

  return (
    <div className={s.page}>
      <header className={s.head}>
        <p className={s.eyebrow}>Explore · reported incidents</p>
        <h1 className={s.title}>Reported robbery, bicycle theft and theft over cluster downtown.</h1>
        <p className={s.dek}>
          In the default view, 2020 to 2023, reports peak from late afternoon into the evening. <strong>Counts are reported incidents, not risk.</strong>
        </p>
      </header>

      <div className={s.dash}>
        <div className={s.filters}>
          {load.status === 'ready' && table && (
            <FilterPanel
              state={state}
              categories={categories}
              catColors={colors}
              dateMin={dateMin}
              dateMax={dateMax}
              onChange={update}
              onReset={reset}
              onPresetFig5={() => update({ cats: ['Robbery'], from: '2020-01-01', to: '2020-12-31', mode: 'city', preset: 'all', weekdays: [1, 2, 3, 4, 5, 6, 7], hours: [0, 23] })}
              open={open}
              onClose={closeDrawer}
              active={active}
            />
          )}
        </div>

        <div className={s.mapCol}>
          <div className={s.mapTop}>
            <button ref={trigger} type="button" className={`${ui.btn} ${s.filtersButton}`} aria-expanded={open} onClick={() => setOpen(true)}>
              Filters{active > 0 ? ` (${active} active)` : ''}
            </button>
            {ready ? (
              <div className={s.totals} aria-live="polite" aria-atomic="true">
                <div className={s.stat}>
                  <span className={s.totalsNum}>{n(derived.records)}</span>
                  <span className={s.totalsLabel}>records</span>
                </div>
                <div className={s.stat}>
                  <span className={s.totalsNum}>{n(derived.distinct)}</span>
                  <span className={s.totalsLabel}><span className={s.longOnly}>distinct </span>event IDs</span>
                </div>
                <span className={s.chip}>{modeLabel}</span>
                <span className="sr-only">{derived.error ?? summary}</span>
              </div>
            ) : (
              <div className={s.totals} aria-live="polite" />
            )}
          </div>
          {ready && derived.error && <p className={s.error} role="alert">{derived.error}</p>}

          {load.status === 'loading' && <div className={s.skeleton} role="status">Loading the incident data…</div>}
          {wantsV2 && v2.status === 'loading' && <div className={s.banner} role="status">Loading auto theft and break and enter records…</div>}
          {(load.status === 'error' || v2.status === 'error') && (
            <div className={s.errorBox} role="alert">
              <p>{load.status === 'error' ? load.message : v2.status === 'error' ? v2.message : ''}</p>
              <button type="button" className={ui.btn} onClick={x.retry}>Try again</button>
            </div>
          )}
          {load.status === 'ready' && table && (
            <>
              <MapView table={table} selected={derived?.selected ?? NO_ROWS} center={derived?.center} site={state.mode === 'station' ? derived?.site : undefined} radiusM={state.mode === 'city' ? undefined : state.radius} catColors={colors} landmark={UNION}>
                <div className={s.clusterLegend} role="group" aria-label="Map colour key">
                  <p className={s.clusterTitle}>Reported incidents per cluster</p>
                  <ul className={s.clusterKey}>
                    {CLUSTER_KEY.map((k) => (
                      <li key={k.label}><i style={{ width: k.size, height: k.size, background: `var(--density-${k.density})` }} aria-hidden="true" />{k.label}</li>
                    ))}
                  </ul>
                </div>
              </MapView>
              <ul className={s.legend} aria-label="Crime type colours of single points">
                <li className={s.legendLead}>Zoomed-in points:</li>
                {shown.map((c) => (
                  <li key={c} className={s.legendItem}><span className={s.legendSwatch} style={{ background: colors[c] }} aria-hidden="true" />{c}</li>
                ))}
              </ul>
              <div className={s.noteRow}>
                <p className={s.note}>Click a cluster to zoom in. One report can have several records, so event IDs are fewer.</p>
                <button type="button" className={`${ui.btn} ${s.detailsBtn}`} aria-expanded={details} aria-controls="map-details" onClick={() => setDetails((d) => !d)}>
                  Details
                  <svg className={details ? s.chevOpen : undefined} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m3 6 5 5 5-5" /></svg>
                </button>
              </div>
              {details && (
                <div id="map-details" className={s.details} role="region" aria-label="About these counts" tabIndex={0}>
                  <p>
                    A record is one row of the police data. One report (event ID) can have several rows, for example a robbery listed with two offence types or a bicycle theft with two bicycles, so there are more records than event IDs.
                    Click a cluster to zoom in, or a point for its crime type, date and hour.
                  </p>
                  <p>
                    These are counts of reported incidents. They are not adjusted for how many people or properties are present, so counts alone do not rank places. The time-of-year
                    presets are illustrative, not official calendars. Bicycle theft records also carry a status such as stolen or recovered that these counts do not separate.
                  </p>
                  {facts && (facts.downtown || facts.hour !== null) && (
                    <p>
                      {facts.downtown && (
                        <>
                          Within {DOWNTOWN_KM} km of Union Station (downtown): {n(facts.downtown.inside)} of {n(facts.downtown.total)} records shown, {pct(facts.downtown.inside, facts.downtown.total)}.
                          {facts.downtown.byType.length > 1 && <> By crime type: {facts.downtown.byType.map((r) => `${r.name} ${pct(r.inside, r.total)}`).join(', ')}. </>}{' '}
                        </>
                      )}
                      {facts.hour !== null && <>Busiest hour: {String(facts.hour).padStart(2, '0')}:00. </>}
                      {facts.evening && (
                        <>
                          Reported from {EVENING[0]}:00 to {EVENING[1]}:59: {pct(facts.evening.count, facts.evening.total)} of the records shown, against {pct(facts.evening.even, 1)} if they were spread evenly over the day.{' '}
                        </>
                      )}
                      Computed in your browser from the filters above.
                    </p>
                  )}
                  <p>{derived?.error ?? summary}</p>
                  <p>Basemap © OpenStreetMap contributors.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className={s.charts} ref={column}>
          {ready && (
            <>
              <ChartCard
                id="trend"
                title="Over time"
                controls={
                  <ToggleGroup.Root type="single" className={`${ui.segmented} ${s.interval}`} value={state.interval} aria-label="Group the trend by" onValueChange={(v) => v && update({ interval: v as Interval })}>
                    {([['day', 'D', 'Daily'], ['week', 'W', 'Weekly'], ['month', 'M', 'Monthly']] as const).map(([v, short, long]) => (
                      <ToggleGroup.Item key={v} value={v} className={`${ui.segItem} ${s.intervalItem}`} aria-label={long} title={long}>{short}</ToggleGroup.Item>
                    ))}
                  </ToggleGroup.Root>
                }
                spec={charts.trend}
                height={heights.trend}
                description="Lines of the number of selected reported incidents per period for each crime type, over the full date range."
                table={derived.trend.filter((_, i) => i < 400).map((r) => ({ Date: isoDate(r.day), 'Crime type': r.category, Incidents: Number.isNaN(r.count) ? '' : n(r.count) }))}
                csvName="incidents-over-time.csv"
                onSignal={{ name: 'brush', handler: onBrush }}
                footnote={ranged ? `Dates: ${isoDate(derived.dateFrom)} to ${isoDate(derived.dateTo)}` : 'Drag across the chart to set the dates.'}
                menuExtra={
                  <>
                    <button type="button" onClick={csv}>Download daily counts (CSV)</button>
                    {ranged && <button type="button" onClick={() => update({ from: '', to: '' })}>Show the full date range</button>}
                  </>
                }
              />
              <ChartCard
                id="by-category"
                title="By crime type"
                spec={charts.category}
                height={heights.type}
                description="Bars of selected reported incidents per crime type."
                table={barRows.names.map((c, i) => ({ 'Crime type': c, Incidents: n(barRows.counts[i]) }))}
                csvName="incidents-by-crime-type.csv"
              />
              <ChartCard
                id="by-when"
                srTitle={when === 'hour' ? 'Incidents by hour of day' : 'Incidents by weekday'}
                controls={
                  <Segmented<When> label="Show incidents by" value={when} onChange={setWhen} options={[{ value: 'hour', label: 'Hour' }, { value: 'weekday', label: 'Weekday' }]} />
                }
                spec={when === 'hour' ? charts.hour : charts.weekday}
                height={heights.when}
                description={when === 'hour' ? 'Bars of selected reported incidents per hour of the day; the busiest hour is darker.' : 'Bars of selected reported incidents per weekday, Monday to Sunday.'}
                table={when === 'hour' ? derived.bars.byHour.map((c, h) => ({ Hour: `${String(h).padStart(2, '0')}:00`, Incidents: n(c) })) : WEEKDAY_LABELS.map((d, i) => ({ Weekday: d, Incidents: n(derived.bars.byWeekday[i]) }))}
                csvName={when === 'hour' ? 'incidents-by-hour.csv' : 'incidents-by-weekday.csv'}
                menuUp
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
