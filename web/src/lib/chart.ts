// Shared chart plumbing: the Vega-Lite theme comes from design/tokens.json via design/vega-theme.json.
import theme from '../../../design/vega-theme.json'

export type Mode = 'light' | 'dark'
export type Spec = Record<string, unknown>

export const CATEGORY_KEYS = ['robbery', 'auto-theft', 'break-enter', 'theft-over', 'bicycle-theft'] as const

/** Attach the themed config; the spec itself carries no colours except through the scales. */
export function themed(spec: Spec, mode: Mode): Spec {
  return { $schema: 'https://vega.github.io/schema/vega-lite/v6.json', ...spec, config: (theme as Record<Mode, unknown>)[mode] }
}

export function csvOf(rows: Record<string, string | number | null>[]): string {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const cell = (v: string | number | null) => {
    const s = v === null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n'
}
