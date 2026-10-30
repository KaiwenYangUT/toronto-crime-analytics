// Reads the columnar Explore bundle written by pipeline/src/tca/explore/export.py.
import { isoWeekday, type EventTable } from './analysis.ts'

export interface BundleMeta {
  n: number
  endianness: 'little'
  columns: { name: string; dtype: string; offset: number }[]
  dictionaries: { category: string[]; status: string[]; premises: string[]; location: string[] }
  first_day: number
  last_day: number
  bytes: number
  sha256: string
}

export interface Bundle {
  table: EventTable
  meta: BundleMeta
  status: Uint8Array
  premises: Uint8Array
  location: Uint8Array
}

/** Typed-array views over the buffer; no copying. Element sizes must divide the offsets. */
export function parseBundle(buffer: ArrayBuffer, meta: BundleMeta): Bundle {
  if (buffer.byteLength !== meta.bytes) throw new Error(`bundle is ${buffer.byteLength} bytes, expected ${meta.bytes}`)
  const n = meta.n
  const at = (name: string) => {
    const c = meta.columns.find((x) => x.name === name)
    if (!c) throw new Error(`bundle has no ${name} column`)
    return c.offset
  }
  const day = new Uint16Array(buffer, at('day'), n)
  const weekday = new Uint8Array(n)
  for (let i = 0; i < n; i++) weekday[i] = isoWeekday(day[i])
  const table: EventTable = {
    n,
    day: Int32Array.from(day),
    hour: new Uint8Array(buffer, at('hour'), n),
    weekday,
    category: new Uint8Array(buffer, at('category'), n),
    lon: new Float64Array(buffer, at('lon'), n),
    lat: new Float64Array(buffer, at('lat'), n),
    eventClass: new Uint32Array(buffer, at('event_class'), n),
    categories: meta.dictionaries.category,
  }
  return {
    table,
    meta,
    status: new Uint8Array(buffer, at('status'), n),
    premises: new Uint8Array(buffer, at('premises'), n),
    location: new Uint8Array(buffer, at('location'), n),
  }
}

/** SHA-256 of the buffer must equal the value recorded when the bundle was written. */
export async function verifyBundle(buffer: ArrayBuffer, meta: BundleMeta): Promise<void> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))
  const hex = Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')
  if (hex !== meta.sha256) throw new Error('The Explore data bundle does not match its checksum.')
}

function concat<T extends Int32Array | Uint8Array | Float64Array | Uint32Array>(a: T, b: T): T {
  const out = new (a.constructor as new (n: number) => T)(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

/** The legacy table followed by the v2 records; v2 category codes are shifted past the legacy dictionary. */
export function mergeTables(a: EventTable, b: EventTable): EventTable {
  const shift = a.categories.length
  const shifted = Uint8Array.from(b.category, (c) => c + shift)
  return {
    n: a.n + b.n,
    day: concat(a.day, b.day),
    hour: concat(a.hour, b.hour),
    weekday: concat(a.weekday, b.weekday),
    category: concat(a.category, shifted),
    lon: concat(a.lon, b.lon),
    lat: concat(a.lat, b.lat),
    eventClass: concat(a.eventClass, b.eventClass),
    categories: [...a.categories, ...b.categories],
  }
}

/** Auto theft and break and enter, fetched only when one of them is switched on. */
export async function loadV2(base: string): Promise<Bundle> {
  const [metaRes, binRes] = await Promise.all([fetch(`${base}/v2-meta.json`), fetch(`${base}/v2.bin`)])
  if (!metaRes.ok || !binRes.ok) throw new Error('Could not load the additional crime types.')
  const meta = (await metaRes.json()) as BundleMeta
  const buffer = await binRes.arrayBuffer()
  await verifyBundle(buffer, meta)
  return parseBundle(buffer, meta)
}

export async function loadBundle(base: string): Promise<Bundle> {
  const [metaRes, binRes] = await Promise.all([fetch(`${base}/meta.json`), fetch(`${base}/legacy.bin`)])
  if (!metaRes.ok || !binRes.ok) throw new Error('Could not load the Explore data bundle.')
  const meta = (await metaRes.json()) as BundleMeta
  const buffer = await binRes.arrayBuffer()
  await verifyBundle(buffer, meta)
  return parseBundle(buffer, meta)
}
