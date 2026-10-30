import type { ReactNode } from 'react'
import { ResultsContext, numberText, provenanceOf, useResults, type PageResults } from '../lib/results.ts'

export function ResultsProvider({ data, children }: { data: PageResults; children: ReactNode }) {
  return <ResultsContext.Provider value={data}>{children}</ResultsContext.Provider>
}

/** A number from results JSON, formatted by its stored display format, with its provenance as a tooltip. */
export function Num({ k }: { k: string }) {
  const data = useResults()
  return (
    <span className="tnum" title={provenanceOf(data, k)}>
      {numberText(data, k)}
    </span>
  )
}
