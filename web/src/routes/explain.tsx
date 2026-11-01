import type { Route } from './+types/explain'
import { ResultsProvider } from '../components/Num.tsx'
import { Explain } from '../content/Explain.tsx'
import pageData from '../data/pages/explain.json'
import { censusRatioTrend, censusScatter2d, oddsByTime, postByComparator, SLOT_WIDTH, svgsForSlot } from '../lib/specs.ts'
import type { PageResults } from '../lib/results.ts'

export function meta() {
  return [{ title: 'Explain · Toronto robbery vs property crime' }]
}

export async function loader() {
  const { one } = await import('../lib/vegaServer.ts')
  const data = pageData as unknown as PageResults
  const { eight, narrow } = SLOT_WIDTH
  // The three charts in the page body get the slot width and the 360 px variants. The forest and calibration charts live
  // in closed disclosures, so they ship no prerendered SVG.
  return {
    data,
    svgs: {
      after: await svgsForSlot(one, postByComparator(data).spec, eight, narrow),
      time: await svgsForSlot(one, oddsByTime(data).spec, eight, narrow),
      scatter: await svgsForSlot(one, censusScatter2d(data).spec, eight, narrow),
      ratio: await svgsForSlot(one, censusRatioTrend(data).spec, eight, narrow),
    },
  }
}

export default function ExplainRoute({ loaderData }: Route.ComponentProps) {
  return (
    <ResultsProvider data={loaderData.data}>
      <Explain svgs={loaderData.svgs} />
    </ResultsProvider>
  )
}
