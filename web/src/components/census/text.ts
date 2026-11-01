// Text and table rows for the census scatter. Every number goes through the stored display formats.
import type { TableRow } from '../Figure.tsx'
import { formatFor, formatNumber, type PageResults } from '../../lib/results.ts'
import type { CensusFormats } from './scene.ts'
import type { CensusBand, CensusScatterData } from './types.ts'

const KEY = 'predict.census_scatter'

/** Band indices with the lowest and highest median among all but the first band. */
export function otherBandExtremes(bands: CensusBand[]): { lo: number; hi: number } {
  const rest = bands.map((b, i) => ({ i, m: b.median_robberies })).slice(1)
  return {
    lo: rest.reduce((a, b) => (b.m < a.m ? b : a)).i,
    hi: rest.reduce((a, b) => (b.m > a.m ? b : a)).i,
  }
}

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
    `Neighbourhood scatter of ${n('n', s.n)} neighbourhoods: permanent job to labour force ratio, individual median income and robberies reported in 2020, from the 2020 neighbourhood extract.`,
    `In five groups of neighbourhoods by median income, the median robbery count is ${n('income_bands.0.median_robberies', s.income_bands[0].median_robberies)} in the lowest-income group and ${n('income_bands.4.median_robberies', s.income_bands[4].median_robberies)} in the highest-income group.`,
    `In five groups by job ratio, the median count is ${n('ratio_bands.0.median_robberies', s.ratio_bands[0].median_robberies)} in the lowest-ratio group and between ${n('ratio_bands.1.median_robberies', Math.min(...s.ratio_bands.slice(1).map((b) => b.median_robberies)))} and ${n('ratio_bands.1.median_robberies', Math.max(...s.ratio_bands.slice(1).map((b) => b.median_robberies)))} in the other four, with no steady pattern.`,
    `The top tenth of neighbourhoods by robbery count (${n('top_decile.n', s.top_decile.n)} of them) have a median income of ${n('top_decile.median_income', s.top_decile.median_income)} dollars, against ${n('rest.median_income', s.rest.median_income)} dollars in the rest.`,
    `The most robberies were reported in ${s.max.name}, ${n('max.robberies', s.max.robberies)}.`,
    'These are counts of reported incidents, not rates per resident and not risk.',
  ].join(' ')
}
