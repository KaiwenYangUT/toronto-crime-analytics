import type { Route } from './+types/methods'
import { ResultsProvider } from '../components/Num.tsx'
import { Methods } from '../content/Methods.tsx'
import pageData from '../data/pages/methods.json'
import type { PageResults } from '../lib/results.ts'

export function meta() {
  return [{ title: 'Methods · Toronto robbery vs property crime' }]
}

export function loader() {
  return { data: pageData as unknown as PageResults }
}

export default function MethodsRoute({ loaderData }: Route.ComponentProps) {
  return (
    <ResultsProvider data={loaderData.data}>
      <Methods />
    </ResultsProvider>
  )
}
