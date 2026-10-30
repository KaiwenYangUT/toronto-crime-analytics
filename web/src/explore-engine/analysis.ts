// Pure TypeScript implementation of the Explore filters and aggregates. It reproduces the
// behaviour of the original R analysis functions (checked against R-generated fixtures):
// integer day numbers, ISO weekdays (Monday = 1), Monday-based weeks, the R haversine constant
// and clamp, inclusive bounds, NA gaps for days a filter excludes, and eligible-day counts.

export type Preset = 'all' | 'midterm' | 'final' | 'break_time' | 'peak' | 'off_peak'

export interface EventTable {
  n: number
  /** days since 1970-01-01 */
  day: Int32Array
  hour: Uint8Array
  /** ISO weekday, Monday = 1 */
  weekday: Uint8Array
  /** index into `categories` */
  category: Uint8Array
  lon: Float64Array
  lat: Float64Array
  /** integer equivalence class of the event ID: equal IDs share a class */
  eventClass: Uint32Array
  /** category labels; their order defines the bar-chart order */
  categories: string[]
}

export interface Point {
  lon: number
  lat: number
}

export interface Filter {
  dateFrom: number
  dateTo: number
  categories: ReadonlySet<number>
  preset: Preset
  weekdays: ReadonlySet<number>
  hours: readonly [number, number]
  center?: Point
  radiusM?: number
}

export interface DailyRow {
  day: number
  category: string
  /** NaN marks a day or hour the filters exclude (rendered blank, never bridged) */
  count: number
}

export interface TrendRow extends DailyRow {
  eligibleDays: number
}

const EARTH_RADIUS_M = 6371008.8
const RAD = Math.PI / 180

export function haversineM(lon: number, lat: number, targetLon: number, targetLat: number): number {
  const a =
    Math.sin(((lat - targetLat) * RAD) / 2) ** 2 +
    Math.cos(lat * RAD) * Math.cos(targetLat * RAD) * Math.sin(((lon - targetLon) * RAD) / 2) ** 2
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))))
}

export interface NamedPoint extends Point {
  id: string
  name: string
}

export function nearestStation(site: Point, stations: readonly NamedPoint[]): NamedPoint {
  if (!stations.length) throw new Error('Choose one destination and supply stations.')
  let best = stations[0]
  let bestDistance = Infinity
  for (const s of stations) {
    const d = haversineM(s.lon, s.lat, site.lon, site.lat)
    if (d < bestDistance) {
      best = s
      bestDistance = d
    }
  }
  return best
}

/** Days since the epoch for a calendar date given as YYYY-MM-DD. */
export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

export function isoDate(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10)
}

/** ISO weekday (Monday = 1) of a day number; 1970-01-01 was a Thursday. */
export function isoWeekday(day: number): number {
  return ((((day + 3) % 7) + 7) % 7) + 1
}

/** Month (1-12) and day of month for a day number (Hinnant's civil-from-days, integer only). */
function civil(day: number): { year: number; month: number; dom: number } {
  const z = day + 719_468
  const era = Math.floor(z / 146_097)
  const doe = z - era * 146_097
  const yoe = Math.floor((doe - Math.floor(doe / 1_460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365)
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const dom = doy - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp < 10 ? mp + 3 : mp - 9
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, dom }
}

const PEAK_HOURS = new Set([6, 7, 8, 15, 16, 17, 18])

export function periodMask(day: number, hour: number, preset: Preset): boolean {
  const { month, dom } = civil(day)
  const peak = isoWeekday(day) <= 5 && PEAK_HOURS.has(hour)
  switch (preset) {
    case 'all':
      return true
    case 'midterm':
      return month === 2 || month === 10
    case 'final':
      return month === 4 || month === 12
    case 'break_time':
      return (month >= 6 && month <= 8) || (month === 12 && dom >= 23) || (month === 1 && dom <= 3)
    case 'peak':
      return peak
    case 'off_peak':
      return !peak
    default:
      throw new Error(`Unknown time preset: ${String(preset)}`)
  }
}

/** Indices of the events that pass every filter, in table order. */
export function filterEvents(t: EventTable, f: Filter): Int32Array {
  if (f.dateFrom > f.dateTo || Number.isNaN(f.dateFrom) || Number.isNaN(f.dateTo)) {
    throw new Error('Choose a valid date range.')
  }
  const [h0, h1] = f.hours
  if (Number.isNaN(h0) || Number.isNaN(h1) || h0 < 0 || h1 > 23 || h0 > h1) {
    throw new Error('Choose a valid hour range.')
  }
  if (f.center && !(f.radiusM !== undefined && Number.isFinite(f.radiusM) && f.radiusM > 0)) {
    throw new Error('Invalid spatial filter.')
  }
  const out: number[] = []
  for (let i = 0; i < t.n; i++) {
    if (t.day[i] < f.dateFrom || t.day[i] > f.dateTo) continue
    if (!f.categories.has(t.category[i]) || !f.weekdays.has(t.weekday[i])) continue
    if (t.hour[i] < h0 || t.hour[i] > h1) continue
    if (!periodMask(t.day[i], t.hour[i], f.preset)) continue
    if (f.center && haversineM(t.lon[i], t.lat[i], f.center.lon, f.center.lat) > (f.radiusM as number)) continue
    out.push(i)
  }
  return Int32Array.from(out)
}

/**
 * Zero-filled daily counts over the grid dates x categories. Days that no selected weekday and
 * hour can reach stay NaN so lines do not bridge them. Rows are ordered by date, then category
 * label, which is the order the original's merge() produced.
 */
export function dailyCounts(
  t: EventTable,
  selected: Int32Array,
  dateFrom: number,
  dateTo: number,
  categoryLabels: readonly string[],
  preset: Preset,
  weekdays: ReadonlySet<number>,
  hours: readonly [number, number],
): DailyRow[] {
  if (!categoryLabels.length || dateTo < dateFrom) return []
  const labels = [...categoryLabels].sort()
  const nDays = dateTo - dateFrom + 1
  const tally = new Map<string, number>()
  for (let k = 0; k < selected.length; k++) {
    const i = selected[k]
    const key = `${t.day[i]}|${t.categories[t.category[i]]}`
    tally.set(key, (tally.get(key) ?? 0) + 1)
  }
  const rows: DailyRow[] = []
  for (let d = 0; d < nDays; d++) {
    const day = dateFrom + d
    let eligible = weekdays.has(isoWeekday(day))
    if (eligible) {
      eligible = false
      for (let h = hours[0]; h <= hours[1] && !eligible; h++) eligible = periodMask(day, h, preset)
    }
    for (const category of labels) {
      rows.push({ day, category, count: eligible ? (tally.get(`${day}|${category}`) ?? 0) : Number.NaN })
    }
  }
  return rows
}

export type Interval = 'day' | 'week' | 'month'

function bucketDay(day: number, interval: Interval): number {
  if (interval === 'day') return day
  if (interval === 'week') return day - (isoWeekday(day) - 1)
  const { year, month } = civil(day)
  return Date.UTC(year, month - 1, 1) / 86_400_000
}

/** Aggregate the eligible-day grid into day, week (Monday start) or month buckets. */
export function trendCounts(daily: readonly DailyRow[], interval: Interval): TrendRow[] {
  if (!daily.length) return []
  const groups = new Map<string, TrendRow>()
  for (const r of daily) {
    const bucket = bucketDay(r.day, interval)
    const key = `${bucket}|${r.category}`
    let g = groups.get(key)
    if (!g) {
      g = { day: bucket, category: r.category, count: Number.NaN, eligibleDays: 0 }
      groups.set(key, g)
    }
    if (!Number.isNaN(r.count)) {
      g.count = (Number.isNaN(g.count) ? 0 : g.count) + r.count
      g.eligibleDays += 1
    }
  }
  return [...groups.values()].sort((a, b) => a.day - b.day || (a.category < b.category ? -1 : a.category > b.category ? 1 : 0))
}

export interface CsvMeta {
  /** destination or station name, or null when there is no spatial filter */
  scope: string | null
  radiusM: number | null
  preset: Preset
  weekdays: readonly number[]
  hours: readonly [number, number]
}

const CSV_HEADER =
  '"date","category","count","scope","radius_m","time_preset","selected_weekdays","selected_hours"'

/** A quoted CSV string, with embedded quotes doubled as write.csv does. */
const quoted = (s: string) => `"${s.replaceAll('"', '""')}"`

/** The "Download daily counts" file, byte-for-byte what R's write.csv produced (LF line ends). */
export function dailyCsv(daily: readonly DailyRow[], meta: CsvMeta): string {
  const scope = meta.scope === null ? 'All supplied locations' : meta.scope
  const tail = [
    quoted(scope),
    meta.radiusM === null ? '' : String(meta.radiusM),
    quoted(meta.preset),
    quoted(meta.weekdays.join(',')),
    quoted(`${meta.hours[0]}-${meta.hours[1]}`),
  ].join(',')
  const lines = [CSV_HEADER]
  for (const r of daily) {
    lines.push(`${isoDate(r.day)},${quoted(r.category)},${Number.isNaN(r.count) ? '' : r.count},${tail}`)
  }
  return lines.join('\n') + '\n'
}

/** Number of distinct event IDs among the selected records. */
export function distinctEvents(t: EventTable, selected: Int32Array): number {
  const seen = new Set<number>()
  for (let k = 0; k < selected.length; k++) seen.add(t.eventClass[selected[k]])
  return seen.size
}

/** Counts of the selected events per category (table order), ISO weekday 1-7 and hour 0-23. */
export function barCounts(t: EventTable, selected: Int32Array) {
  const byCategory = new Array<number>(t.categories.length).fill(0)
  const byWeekday = new Array<number>(7).fill(0)
  const byHour = new Array<number>(24).fill(0)
  for (let k = 0; k < selected.length; k++) {
    const i = selected[k]
    byCategory[t.category[i]]++
    byWeekday[t.weekday[i] - 1]++
    byHour[t.hour[i]]++
  }
  return { byCategory, byWeekday, byHour }
}
