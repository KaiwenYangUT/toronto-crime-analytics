// Numbers on the site come only from results JSON: <Num k="results.key:path.to.value" />.
// The page loader supplies the values, their provenance and the display formats from
// results/index.json (plus design/display_formats.json); a missing value or format fails the build.
import { createContext, useContext } from 'react'

export interface DisplayFormat {
  decimals?: number
  percent?: boolean
  p?: boolean
  /** no thousands separator (years) */
  plain?: boolean
}

export interface ResultEntry {
  producer: string
  git_sha: string
  created: string
  values: unknown
}

export interface PageResults {
  results: Record<string, ResultEntry>
  formats: Record<string, DisplayFormat>
}

export const ResultsContext = createContext<PageResults | null>(null)

export function useResults(): PageResults {
  const r = useContext(ResultsContext)
  if (!r) throw new Error('useResults needs a ResultsProvider')
  return r
}

export function splitKey(k: string): { key: string; path: string[] } {
  const at = k.indexOf(':')
  if (at < 0) throw new Error(`Result reference "${k}" must look like results.key:path`)
  return { key: k.slice(0, at), path: k.slice(at + 1).split('.') }
}

export function getValue(data: PageResults, k: string): unknown {
  const { key, path } = splitKey(k)
  const entry = data.results[key]
  if (!entry) throw new Error(`Results key "${key}" is not loaded on this page (${k})`)
  let node: unknown = entry.values
  for (const part of path) {
    if (node === null || typeof node !== 'object' || !(part in (node as Record<string, unknown>))) {
      throw new Error(`No value at ${k}`)
    }
    node = (node as Record<string, unknown>)[part]
  }
  return node
}

function matches(pattern: string[], path: string[]): boolean {
  return pattern.length === path.length && pattern.every((p, i) => p === '*' || p === path[i])
}

export function formatFor(data: PageResults, k: string): DisplayFormat {
  const { key, path } = splitKey(k)
  let best: DisplayFormat | undefined
  let bestWild = Infinity
  for (const [pat, fmt] of Object.entries(data.formats)) {
    const colon = pat.indexOf(':')
    const patKey = colon < 0 ? null : pat.slice(0, colon)
    if (patKey !== null && patKey !== key) continue
    const segs = (colon < 0 ? pat : pat.slice(colon + 1)).split('.')
    if (!matches(segs, path)) continue
    const wild = segs.filter((s) => s === '*').length
    if (wild < bestWild) {
      best = fmt
      bestWild = wild
    }
  }
  if (!best) throw new Error(`No display format for ${k}`)
  return best
}

export function formatNumber(v: number, f: DisplayFormat): string {
  if (f.p) return v < 0.001 ? '< 0.001' : v.toFixed(3)
  const decimals = f.decimals ?? 0
  const scaled = f.percent ? v * 100 : v
  const s = new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: !f.plain,
  }).format(scaled)
  return f.percent ? `${s}%` : s
}

export function numberText(data: PageResults, k: string): string {
  const v = getValue(data, k)
  if (typeof v !== 'number') throw new Error(`${k} is not a number`)
  return formatNumber(v, formatFor(data, k))
}

export function provenanceOf(data: PageResults, k: string): string {
  const e = data.results[splitKey(k).key]
  return `${splitKey(k).key} · ${e.producer} @ ${e.git_sha.slice(0, 7)}`
}
