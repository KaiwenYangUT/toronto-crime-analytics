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

export async function loadBundle(base: string): Promise<Bundle> {
  const [metaRes, binRes] = await Promise.all([fetch(`${base}/meta.json`), fetch(`${base}/legacy.bin`)])
  if (!metaRes.ok || !binRes.ok) throw new Error('Could not load the Explore data bundle.')
  return parseBundle(await binRes.arrayBuffer(), (await metaRes.json()) as BundleMeta)
}
