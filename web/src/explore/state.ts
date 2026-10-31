// Explore filter state and its URL encoding. The URL is read after hydration so the prerendered
// page always matches the defaults.
import { dayNumber, isoDate, type Interval, type Preset } from '../explore-engine/analysis.ts'

export type Mode = 'city' | 'destination' | 'station'

export interface ExploreState {
  mode: Mode
  place: string
  radius: number
  preset: Preset
  /** category labels switched on */
  cats: string[]
  /** ISO weekdays, Monday = 1 */
  weekdays: number[]
  hours: [number, number]
  /** ISO dates; empty means the full range of the data */
  from: string
  to: string
  interval: Interval
}

export const PRESETS: { value: Preset; label: string; note: string }[] = [
  { value: 'all', label: 'All times', note: '' },
  { value: 'midterm', label: 'Midterm months (February, October)', note: 'Illustrative: months with midterm exams.' },
  { value: 'final', label: 'Final-exam months (April, December)', note: 'Illustrative: months with final exams.' },
  { value: 'break_time', label: 'Summer and winter break', note: 'June to August and 23 December to 3 January.' },
  { value: 'peak', label: 'Weekday commute peaks', note: 'Weekdays, hours 6 to 8 and 15 to 18.' },
  { value: 'off_peak', label: 'Outside commute peaks', note: 'Everything except weekday commute peaks.' },
]

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const RADII_MIN = 100
export const RADII_MAX = 2000

/** Loaded with the page; the first three are the Explorer's original categories. */
export const LEGACY_CATEGORIES = ['Bicycle theft', 'Robbery', 'Theft over']
/** Fetched on demand (v2 bundle). */
export const V2_CATEGORIES = ['Auto theft', 'Break and enter']
export const ALL_CATEGORIES = [...LEGACY_CATEGORIES, ...V2_CATEGORIES]

export function defaults(): ExploreState {
  return { mode: 'city', place: 'site1', radius: 300, preset: 'all', cats: LEGACY_CATEGORIES, weekdays: [1, 2, 3, 4, 5, 6, 7], hours: [0, 23], from: '', to: '', interval: 'week' }
}

export function toParams(s: ExploreState, d: ExploreState): URLSearchParams {
  const p = new URLSearchParams()
  const set = (k: string, v: string, def: string) => v !== def && p.set(k, v)
  set('mode', s.mode, d.mode)
  set('place', s.place, d.place)
  set('radius', String(s.radius), String(d.radius))
  set('time', s.preset, d.preset)
  set('cats', s.cats.join(','), d.cats.join(','))
  set('days', s.weekdays.join(','), d.weekdays.join(','))
  set('hours', s.hours.join('-'), d.hours.join('-'))
  set('from', s.from, d.from)
  set('to', s.to, d.to)
  set('by', s.interval, d.interval)
  return p
}

const MODES: Mode[] = ['city', 'destination', 'station']
const INTERVALS: Interval[] = ['day', 'week', 'month']

/** Parse defensively: anything unrecognised falls back to the default for that field. */
export function fromParams(p: URLSearchParams, d: ExploreState, validPlaces: string[], validCats: string[]): ExploreState {
  const s = { ...d }
  const mode = p.get('mode') as Mode | null
  if (mode && MODES.includes(mode)) s.mode = mode
  const place = p.get('place')
  if (place && validPlaces.includes(place)) s.place = place
  const radius = Number(p.get('radius'))
  if (Number.isFinite(radius) && radius >= RADII_MIN && radius <= RADII_MAX) s.radius = radius
  const time = p.get('time') as Preset | null
  if (time && PRESETS.some((x) => x.value === time)) s.preset = time
  const cats = p.get('cats')
  if (cats !== null) s.cats = cats.split(',').filter((c) => validCats.includes(c))
  const days = p.get('days')
  if (days !== null) s.weekdays = days.split(',').map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
  const hours = /^(\d{1,2})-(\d{1,2})$/.exec(p.get('hours') ?? '')
  if (hours && Number(hours[1]) <= Number(hours[2]) && Number(hours[2]) <= 23) s.hours = [Number(hours[1]), Number(hours[2])]
  for (const k of ['from', 'to'] as const) {
    const v = p.get(k)
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && isoDate(dayNumber(v)) === v) s[k] = v
  }
  const by = p.get('by') as Interval | null
  if (by && INTERVALS.includes(by)) s.interval = by
  return s
}
