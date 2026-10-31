import type { Route } from './+types/explain'
import { ResultsProvider } from '../components/Num.tsx'
import { Explain } from '../content/Explain.tsx'
import pageData from '../data/pages/explain.json'
import { censusScatter2d, oddsByTime, patternChart, SLOT_WIDTH, svgsForSlot } from '../lib/specs.ts'
import type { PageResults } from '../lib/results.ts'

export function meta() {
  return [{ title: 'Explain · Toronto robbery vs property crime' }]
}

export async function loader() {
  const { one } = await import('../lib/vegaServer.ts')
  const data = pageData as unknown as PageResults
  const { eight, narrow } = SLOT_WIDTH
  // Only the first two charts are in view on load: they get the slot width and the 360 px variants. The pattern charts
  // sit in a 52rem block. The forest and calibration charts live in closed disclosures, so they ship no prerendered SVG.
  return {
    data,
    svgs: {
      time: await svgsForSlot(one, oddsByTime(data).spec, eight, narrow),
      scatter: await svgsForSlot(one, censusScatter2d(data).spec, eight, narrow),
      weekday: await svgsForSlot(one, patternChart(data, 'weekday').spec, eight),
      hour: await svgsForSlot(one, patternChart(data, 'hour').spec, eight),
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
