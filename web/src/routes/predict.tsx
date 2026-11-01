import type { Route } from './+types/predict'
import { ResultsProvider } from '../components/Num.tsx'
import { Predict } from '../content/Predict.tsx'
import pageData from '../data/pages/predict.json'
import { blockImportance, DESIGN_A, DESIGN_B, prCurves, rungSteps, SLOT_WIDTH, svgsForSlot } from '../lib/specs.ts'
import type { PageResults } from '../lib/results.ts'

/** The full 1216 px container, and half of it less the 24 px gap between the two precision-recall charts. */
const FULL = 1200
const HALF = 588

export function meta() {
  return [{ title: 'Predict · Toronto robbery vs property crime' }]
}

export async function loader() {
  const { one } = await import('../lib/vegaServer.ts')
  const data = pageData as unknown as PageResults
  const { eight, narrow } = SLOT_WIDTH
  // The step chart is the page's main visual: full width (static PR-AUC view, with phone variants). The importance chart
  // is in an 8-column slot; the two precision-recall charts share a row, a half each, with phone variants.
  return {
    data,
    svgs: {
      steps: await svgsForSlot(one, rungSteps(data, 'pr_auc').spec, FULL, narrow),
      importance: await svgsForSlot(one, blockImportance(data).spec, eight),
      curvesA: await svgsForSlot(one, prCurves(data, DESIGN_A).spec, HALF, narrow),
      curvesB: await svgsForSlot(one, prCurves(data, DESIGN_B).spec, HALF, narrow),
    },
  }
}

export default function PredictRoute({ loaderData }: Route.ComponentProps) {
  return (
    <ResultsProvider data={loaderData.data}>
      <Predict svgs={loaderData.svgs} />
    </ResultsProvider>
  )
}
