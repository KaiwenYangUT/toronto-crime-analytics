import type { Route } from './+types/overview'
import { ResultsProvider } from '../components/Num.tsx'
import { Overview } from '../content/Overview.tsx'
import pageData from '../data/pages/overview.json'
import { shareByYear } from '../lib/specs.ts'
import type { PageResults } from '../lib/results.ts'

export function meta() {
  return [{ title: 'Toronto robbery vs property crime' }, { name: 'description', content: 'Which crime type is a reported Toronto property-type incident? An explanation, a prediction ladder and an explorer.' }]
}

export async function loader() {
  const { renderSvgs } = await import('../lib/vegaServer.ts')
  const data = pageData as unknown as PageResults
  return { data, svg: await renderSvgs(shareByYear(data).spec) }
}

export default function OverviewRoute({ loaderData }: Route.ComponentProps) {
  return (
    <ResultsProvider data={loaderData.data}>
      <Overview svg={loaderData.svg} />
    </ResultsProvider>
  )
}
