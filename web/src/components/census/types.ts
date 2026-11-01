/** Shape of `values` in results `predict.census_scatter` (see results/predict/predict.census_scatter.json). */
export interface CensusPoint {
  name: string
  ratio: number
  income: number
  robberies: number
}

export interface CensusGroup {
  n: number
  median_income: number
  median_ratio: number
}

/** One of five quantile bands of neighbourhoods (lowest value first). */
export interface CensusBand {
  band: number
  n: number
  low: number
  high: number
  median_robberies: number
  mean_robberies: number
  max_robberies: number
}

export interface CensusScatterData {
  points: CensusPoint[]
  summary: {
    n: number
    total_robberies: number
    spearman_income: { rho: number; p: number }
    spearman_ratio: { rho: number; p: number }
    top_decile: CensusGroup & { threshold: number }
    rest: CensusGroup
    max: { name: string; robberies: number }
    income_bands: CensusBand[]
    ratio_bands: CensusBand[]
  }
  axes: {
    ratio_min: number
    ratio_max: number
    income_min: number
    income_max: number
    robberies_max: number
  }
}
