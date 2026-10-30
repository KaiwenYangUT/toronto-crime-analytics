import type { Route } from './+types/predict'
import { ResultsProvider } from '../components/Num.tsx'
import { Predict } from '../content/Predict.tsx'
import pageData from '../data/pages/predict.json'
import { ablationLadder, blockImportance, DESIGN_A, DESIGN_B, prCurves } from '../lib/specs.ts'
import type { PageResults } from '../lib/results.ts'

export function meta() {
  return [{ title: 'Predict · Toronto robbery vs property crime' }]
}

export async function loader() {
  const { renderSvgs } = await import('../lib/vegaServer.ts')
  const data = pageData as unknown as PageResults
  return {
    data,
    svgs: {
      ladder: await renderSvgs(ablationLadder(data, 'pr_auc').spec),
      prA: await renderSvgs(prCurves(data, DESIGN_A).spec),
      prB: await renderSvgs(prCurves(data, DESIGN_B).spec),
      importance: await renderSvgs(blockImportance(data).spec),
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
