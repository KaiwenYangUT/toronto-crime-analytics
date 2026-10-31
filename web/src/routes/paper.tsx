import { ResultsProvider } from '../components/Num.tsx'
import { Paper } from '../content/Paper.tsx'
import pageData from '../data/pages/overview.json'
import type { PageResults } from '../lib/results.ts'

export function meta() {
  return [{ title: 'Paper · Toronto robbery vs property crime' }, { name: 'description', content: 'A short research paper on inference and prediction for robbery among major property crimes in Toronto.' }]
}

export default function PaperRoute() {
  return (
    <ResultsProvider data={pageData as unknown as PageResults}>
      <Paper />
    </ResultsProvider>
  )
}
