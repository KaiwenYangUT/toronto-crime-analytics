// Text and table rows for the census scatter. Every number goes through the stored display formats.
import type { TableRow } from '../Figure.tsx'
import { formatFor, formatNumber, type PageResults } from '../../lib/results.ts'
import type { CensusFormats } from './scene.ts'
import type { CensusScatterData } from './types.ts'

const KEY = 'predict.census_scatter'

export function formatsOf(results: PageResults): CensusFormats {
  const at = 0 // one format per field, whatever the row
  return {
    ratio: formatFor(results, `${KEY}:points.${at}.ratio`),
    income: formatFor(results, `${KEY}:points.${at}.income`),
    robberies: formatFor(results, `${KEY}:points.${at}.robberies`),
  }
}

/** Table cells formatted exactly as the displayed values, one row per neighbourhood. */
export function tableRows(data: CensusScatterData, f: CensusFormats): TableRow[] {
  return data.points.map((p) => ({
    Neighbourhood: p.name,
    'Job ratio': formatNumber(p.ratio, f.ratio),
    'Median income (CAD)': formatNumber(p.income, f.income),
    'Robberies (2020)': formatNumber(p.robberies, f.robberies),
  }))
}

/** Plain-language summary for assistive technology, built from the summary values. */
export function summaryText(data: CensusScatterData, results: PageResults): string {
  const s = data.summary
  const n = (path: string, v: number) => formatNumber(v, formatFor(results, `${KEY}:summary.${path}`))
  return [
    `Neighbourhood scatter of ${n('n', s.n)} neighbourhoods: permanent job to labour force ratio, individual median income and robberies reported in 2020, from the course extract.`,
    `The rank correlation of robbery counts with median income is ${n('spearman_income.rho', s.spearman_income.rho)}, and with the job ratio ${n('spearman_ratio.rho', s.spearman_ratio.rho)}.`,
    `The top tenth of neighbourhoods by robbery count (${n('top_decile.n', s.top_decile.n)} of them) have a median income of ${n('top_decile.median_income', s.top_decile.median_income)} dollars, against ${n('rest.median_income', s.rest.median_income)} dollars in the rest.`,
    `The most robberies were reported in ${s.max.name}, ${n('max.robberies', s.max.robberies)}.`,
    'These are counts of reported incidents, not rates per resident and not risk.',
  ].join(' ')
}
