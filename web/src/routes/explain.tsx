import type { Route } from './+types/explain'
import { ResultsProvider } from '../components/Num.tsx'
import { Explain } from '../content/Explain.tsx'
import pageData from '../data/pages/explain.json'
import { calibrationChart, forestPlot, patternChart } from '../lib/specs.ts'
import type { PageResults } from '../lib/results.ts'

export function meta() {
  return [{ title: 'Explain · Toronto robbery vs property crime' }]
}

export async function loader() {
  const { renderSvgs } = await import('../lib/vegaServer.ts')
  const data = pageData as unknown as PageResults
  return {
    data,
    svgs: {
      forest: await renderSvgs(forestPlot(data).spec),
      calibration: await renderSvgs(calibrationChart(data).spec),
      weekday: await renderSvgs(patternChart(data, 'weekday').spec),
      hour: await renderSvgs(patternChart(data, 'hour').spec),
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
