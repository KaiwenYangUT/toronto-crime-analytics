// Loads the R-generated Explorer reference data (parity/r_outputs/explorer) for the engine tests.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dayNumber, isoWeekday, type EventTable, type NamedPoint } from '../src/explore-engine/analysis.ts'

const root = new URL('../../parity/r_outputs/explorer/', import.meta.url)

/** RFC 4180 parser: quoted fields may hold commas, and "" is an escaped quote. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch !== '\r') field += ch
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Exact value of a C99 hex float such as "-0x1.3d9870566913bp+6" (R's sprintf("%a")). */
export function hexToDouble(s: string): number {
  const m = /^(-?)0x([0-9a-f]+)(?:\.([0-9a-f]*))?p([+-]\d+)$/i.exec(s)
  if (!m) throw new Error(`bad hex float ${s}`)
  const frac = m[3] ?? ''
  const mantissa = Number(BigInt(`0x${m[2]}${frac}`)) // at most 53 bits: exact
  const value = mantissa * 2 ** (Number(m[4]) - 4 * frac.length)
  return m[1] ? -value : value
}

function table(rows: string[][]): { header: string[]; body: string[][] } {
  return { header: rows[0], body: rows.slice(1).filter((r) => r.length > 1) }
}

export const CATEGORIES = ['Bicycle theft', 'Robbery', 'Theft over']

export function loadEvents(): { table: EventTable; ids: string[] } {
  const rows = parseCsv(gunzipSync(readFileSync(new URL('events_hex.csv.gz', root))).toString('utf8'))
  const { header, body } = table(rows)
  const col = (name: string) => header.indexOf(name)
  const n = body.length
  const t: EventTable = {
    n,
    day: new Int32Array(n),
    hour: new Uint8Array(n),
    weekday: new Uint8Array(n),
    category: new Uint8Array(n),
    lon: new Float64Array(n),
    lat: new Float64Array(n),
    eventClass: new Uint32Array(n),
    categories: CATEGORIES,
  }
  const [cId, cDate, cHour, cWeekday, cCat, cLon, cLat] = [
    'event_id', 'date', 'hour', 'weekday', 'category', 'longitude_hex', 'latitude_hex',
  ].map(col)
  const ids = body.map((r) => r[cId])
  const classOf = new Map<string, number>([...new Set(ids)].sort().map((id, k) => [id, k]))
  body.forEach((r, i) => {
    t.eventClass[i] = classOf.get(r[cId]) as number
    t.day[i] = dayNumber(r[cDate])
    t.hour[i] = Number(r[cHour])
    t.weekday[i] = Number(r[cWeekday])
    t.category[i] = CATEGORIES.indexOf(r[cCat])
    t.lon[i] = hexToDouble(r[cLon])
    t.lat[i] = hexToDouble(r[cLat])
  })
  return { table: t, ids }
}

export function loadPoints(file: 'places_hex.csv' | 'stations_hex.csv'): NamedPoint[] {
  const rows = parseCsv(readFileSync(new URL(file, root), 'utf8'))
  const { header, body } = table(rows)
  const col = (name: string) => header.indexOf(name)
  return body.map((r) => ({
    id: r[col('id')], name: r[col('name')],
    lon: hexToDouble(r[col('longitude_hex')]), lat: hexToDouble(r[col('latitude_hex')]),
  }))
}

export interface FixtureCase {
  id: number
  input: {
    mode: 'destination' | 'station' | 'none'
    place: string | null
    station: string | null
    radius_m: number
    preset: 'all' | 'midterm' | 'final' | 'break_time' | 'peak' | 'off_peak'
    weekdays: number | number[]
    hours: number[]
    categories: string | string[]
    date_from: string
    date_to: string
  }
  records: number
  distinct_ids: number
  ids_sha256: string
  by_category: number[]
  by_weekday: number[]
  by_hour: number[]
  daily_rows: number
  daily_na: number
  daily_sha256: string
  day_sha256: string
  week_sha256: string
  month_sha256: string
  csv_sha256: string
  debug?: { csv: string; daily: (number | null)[] }
}

export function loadFixtures(): { meta: Record<string, unknown>; cases: FixtureCase[] } {
  return JSON.parse(readFileSync(new URL('fixtures.json', root), 'utf8'))
}

export const asArray = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v])

export { isoWeekday }
