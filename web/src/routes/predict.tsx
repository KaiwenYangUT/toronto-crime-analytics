import type { Route } from './+types/predict'
import { ResultsProvider } from '../components/Num.tsx'
import { Predict } from '../content/Predict.tsx'
import pageData from '../data/pages/predict.json'
import { blockImportance, rungSteps, SLOT_WIDTH, svgsForSlot } from '../lib/specs.ts'
import type { PageResults } from '../lib/results.ts'

export function meta() {
  return [{ title: 'Predict · Toronto robbery vs property crime' }]
}

export async function loader() {
  const { one } = await import('../lib/vegaServer.ts')
  const data = pageData as unknown as PageResults
  const { eight, narrow } = SLOT_WIDTH
  // The step chart is the page's main visual (static PR-AUC view, with phone variants); the importance chart is in an
  // 8-column slot. The precision-recall curves sit in a closed disclosure, so they ship no prerendered SVG.
  return {
    data,
    svgs: {
      steps: await svgsForSlot(one, rungSteps(data, 'pr_auc').spec, eight, narrow),
      importance: await svgsForSlot(one, blockImportance(data).spec, eight),
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
