import type { Route } from './+types/overview'
import { ResultsProvider } from '../components/Num.tsx'
import { Overview } from '../content/Overview.tsx'
import pageData from '../data/pages/overview.json'
import { SLOT_WIDTH, shareByYear, stepChart, svgsForSlot } from '../lib/specs.ts'
import type { PageResults } from '../lib/results.ts'

export function meta() {
  return [{ title: 'Toronto robbery vs property crime' }, { name: 'description', content: 'Which crime type is a reported Toronto property-type incident? An explanation, a prediction ladder and an explorer.' }]
}

/** Seven of twelve columns at 1280 px (1216 px container, 32 px gaps). */
const SEVEN_COLUMNS = 696
/** The full 1216 px container. */
const FULL = 1200

export async function loader() {
  const { one } = await import('../lib/vegaServer.ts')
  const data = pageData as unknown as PageResults
  // The step chart is the page's main visual: 7-column slot and 360 px variants. The share chart is full width below the fold.
  return {
    data,
    svgs: {
      steps: await svgsForSlot(one, stepChart(data).spec, SEVEN_COLUMNS, SLOT_WIDTH.narrow),
      share: await svgsForSlot(one, shareByYear(data, { labelSize: null }).spec, FULL, SLOT_WIDTH.narrow),
    },
  }
}

export default function OverviewRoute({ loaderData }: Route.ComponentProps) {
  return (
    <ResultsProvider data={loaderData.data}>
      <Overview svgs={loaderData.svgs} />
    </ResultsProvider>
  )
}
