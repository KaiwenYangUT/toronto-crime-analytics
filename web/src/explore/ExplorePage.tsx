import { useEffect, useMemo, useState } from 'react'
import { Callout } from '../components/Callout.tsx'
import { Figure } from '../components/Figure.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { dailyCsv, isoDate, type Interval } from '../explore-engine/analysis.ts'
import { FilterPanel } from './FilterPanel.tsx'
import { MapView } from './MapView.tsx'
import { categoryBars, hourBars, trendSpec, weekdayBars } from './specs.ts'
import { ALL_CATEGORIES, PRESETS, WEEKDAY_LABELS } from './state.ts'
import { useExplore } from './useExplore.ts'
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

export function Explore() {
  const x = useExplore()
  const { load, state, update, reset, derived, table, v2, wantsV2 } = x
  const [open, setOpen] = useState(false)
  const categories = ALL_CATEGORIES
  const colors = useCategoryColors(categories)
  const meta = load.status === 'ready' ? load.bundle.meta : null
  const dateMin = meta ? isoDate(meta.first_day) : ''
  const dateMax = meta ? isoDate(meta.last_day) : ''

  const summary = useMemo(() => {
    if (!derived) return ''
    const where = state.mode === 'city' ? 'Citywide' : `${state.radius} m around ${state.mode === 'station' ? (derived.center?.name ?? '') : derived.site.name}`
    const what = state.cats.length === ALL_CATEGORIES.length ? 'all crime types' : state.cats.join(', ') || 'no crime type'
    const when = PRESETS.find((p) => p.value === state.preset)?.label ?? ''
    return `${where} · ${what} · ${isoDate(derived.dateFrom)} to ${isoDate(derived.dateTo)} · ${when.toLowerCase()} · ${state.weekdays.length === 7 ? 'every weekday' : state.weekdays.map((d) => WEEKDAY_LABELS[d - 1]).join(', ') || 'no weekday'} · hours ${state.hours[0]} to ${state.hours[1]}`
  }, [derived, state])

  const charts = useMemo(() => {
    if (!derived || !table) return null
    const week = derived.bars
    return {
      trend: trendSpec(derived.trend),
      category: categoryBars(table.categories, week.byCategory),
      weekday: weekdayBars(week.byWeekday),
      hour: hourBars(week.byHour),
    }
  }, [derived, table])

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

  const onBrush = (v: unknown) => {
    const d = (v as { date?: [number, number] } | null)?.date
    if (!d || d.length !== 2) return
    update({ from: isoDate(Math.floor(d[0] / 86_400_000)), to: isoDate(Math.ceil(d[1] / 86_400_000)) })
  }

  return (
    <>
      <PageHeader
        eyebrow="Explore · reported incidents"
        title="Reported incidents differ by place, weekday and hour, and every filter changes the count."
        dek="Reports of five property-type crimes, 2020 to 2023. Auto theft and break and enter load when you switch them on. Counts are reported incidents, not risk."
      />
      <div className={s.layout}>
        <div className={s.panelWrap}>
          <button type="button" className={`${ui.btn} ${s.filtersButton}`} aria-expanded={open} onClick={() => setOpen(true)} style={{ marginBottom: 'var(--space-3)' }}>
            Filters
          </button>
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
              onClose={() => setOpen(false)}
            />
          )}
        </div>

        <div className={s.main}>
          {load.status === 'loading' && <div className={s.skeleton} style={{ minHeight: 420 }} role="status">Loading the incident data…</div>}
          {wantsV2 && v2.status === 'loading' && <div className={s.skeleton} style={{ minHeight: 120 }} role="status">Loading auto theft and break and enter records…</div>}
          {(load.status === 'error' || v2.status === 'error') && (
            <div className={s.error} role="alert">
              <p>{load.status === 'error' ? load.message : v2.status === 'error' ? v2.message : ''}</p>
              <button type="button" className={ui.btn} onClick={x.retry}>Try again</button>
            </div>
          )}
          {derived && table && charts && (
            <>
              <div className={s.totals} aria-live="polite" aria-atomic="true">
                <div>
                  <span className={s.totalsNum}>{n(derived.records)}</span>
                  <span className={s.totalsLabel}>records</span>
                </div>
                <div>
                  <span className={s.totalsNum}>{n(derived.distinct)}</span>
                  <span className={s.totalsLabel}>distinct event IDs</span>
                </div>
                <span className={s.chip}>{state.mode === 'city' ? 'Citywide' : state.mode === 'destination' ? 'Near a destination' : 'Near a listed station'}</span>
                <p className={s.summary}>{derived.error ?? summary}</p>
              </div>
              <MapView table={table} selected={derived.selected} center={derived.center} site={state.mode === 'station' ? derived.site : undefined} radiusM={state.mode === 'city' ? undefined : state.radius} catColors={colors} />
              <ul className={ui.legend} aria-label="Map legend">
                {categories.map((c) => (
                  <li key={c} className={ui.legendItem}><span className={ui.swatch} style={{ background: colors[c], borderRadius: 6 }} aria-hidden="true" />{c}</li>
                ))}
                <li className={ui.legendItem}>Clusters: records per circle, from few (dark) to many (light)</li>
              </ul>
              <p className={s.mapNote}>
                One event can have several records, so records can exceed distinct event IDs. Clusters merge nearby records at low zoom; click a cluster to zoom, or a point for its
                crime type, date and hour. Basemap © OpenStreetMap contributors.
              </p>
              <div className={ui.stack}>
                <Segmented<Interval> label="Group the trend by" value={state.interval} onChange={(v) => update({ interval: v })} options={[{ value: 'day', label: 'Daily' }, { value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]} />
                <Figure
                  id="trend"
                  title="Records over time"
                  subtitle="Drag across the chart to set the date range. Gaps mean the filters exclude those days."
                  spec={charts.trend}
                  description="Lines of the number of selected records per period for each crime type."
                  minHeight={300}
                  noCsv
                  onSignal={{ name: 'brush', handler: onBrush }}
                  caption="Weeks start on Monday; the first and last periods may be partial. Days the weekday, hour or time-of-year filters exclude stay blank rather than showing zero."
                  extraActions={<button type="button" className={ui.btn} onClick={csv}>Download daily counts (CSV)</button>}
                  table={derived.trend.filter((_, i) => i < 400).map((r) => ({ Date: isoDate(r.day), 'Crime type': r.category, Records: Number.isNaN(r.count) ? '' : n(r.count) }))}
                />
              </div>
              <div className={s.bars}>
                <Figure id="by-category" compact title="By crime type" spec={charts.category} description="Bars of selected records per crime type." minHeight={220} table={table.categories.map((c, i) => ({ 'Crime type': c, Records: n(derived.bars.byCategory[i]) }))} />
                <Figure id="by-weekday" compact title="By weekday" spec={charts.weekday} description="Bars of selected records per weekday, Monday to Sunday." minHeight={220} table={WEEKDAY_LABELS.map((d, i) => ({ Weekday: d, Records: n(derived.bars.byWeekday[i]) }))} />
                <Figure id="by-hour" compact title="By hour" spec={charts.hour} description="Bars of selected records per hour of the day." minHeight={220} table={derived.bars.byHour.map((c, h) => ({ Hour: String(h).padStart(2, '0'), Records: n(c) }))} />
              </div>
              <Callout variant="caveat" title="How to read these counts">
                <p>
                  They are counts of reported incidents. They are not adjusted for how many people or properties are present, so counts alone do not rank places. The time-of-year
                  presets are illustrative, not official calendars. Bicycle theft records also carry a status such as stolen or recovered that these counts do not separate.
                </p>
              </Callout>
            </>
          )}
        </div>
      </div>
    </>
  )
}
