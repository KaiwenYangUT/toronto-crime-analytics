import { Link } from 'react-router'
import { Figure } from '../components/Figure.tsx'
import { KeyPoints } from '../components/KeyPoints.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { useResults } from '../lib/results.ts'
import type { ChartSvgs } from '../lib/vegaServer.ts'
import { DESIGN_A, shareByYear, stepChart } from '../lib/specs.ts'
import ui from '../components/ui.module.css'
import p from './pages.module.css'

export type OverviewSvgs = { steps: ChartSvgs; share: ChartSvgs }

const X = 'explain.sta303_v2'
const A = 'predict.ablation'
const C = 'predict.census_scatter'
const v = (rung: string, m: string, f: string) => `${A}:designs.${DESIGN_A}.variants.${rung}.${m}.${f}`

const LENSES = [
  { to: '/explore', name: 'Explore', text: 'Filter reported incidents on a map.' },
  { to: '/explain', name: 'Explain', text: 'Which timing differences are statistically clear.' },
  { to: '/predict', name: 'Predict', text: 'How well a model tells the crime types apart.' },
]

export function Overview({ svgs }: { svgs: OverviewSvgs }) {
  const data = useResults()
  const steps = stepChart(data)
  const share = shareByYear(data, { labelSize: null })
  return (
    <>
      <PageHeader
        eyebrow="Toronto Police open data · 2014 to 2023"
        title="Robbery or other property crime? The premises tell you far more than the time."
      />

      <div className={p.landing}>
        <div className={p.landingText}>
          <KeyPoints
            label="Key findings"
            items={[
              { stat: <Num k={`${X}:robbery_share`} />, text: <>of <Num k={`${X}:n`} /> reported incidents were robberies.</> },
              {
                stat: <Num k={v('L1', 'pr_auc', 'estimate')} />,
                text: (
                  <>
                    PR-AUC, a score from zero to one, from time alone: close to guessing at <Num k={`${A}:designs.${DESIGN_A}.prevalence`} />. The full model reaches <Num k={v('L5', 'pr_auc', 'estimate')} />.
                  </>
                ),
              },
              { stat: <Num k={`${X}:post2019.or`} />, text: <>times the odds of a robbery after 2019.</> },
              {
                stat: <Num k={`${C}:summary.spearman_income.rho`} />,
                text: (
                  <>
                    correlation between neighbourhood income and robbery counts: weak. <Link className={p.textLink} to="/explain#income">See Explain</Link>
                  </>
                ),
              },
            ]}
          />
        </div>
        <div className={p.landingVisual}>
          <Figure
            id="what-tells-apart"
            title="What tells robbery apart"
            subtitle="PR-AUC with 95% intervals, tested on held-out neighbourhoods. Grey ticks mark guessing."
            spec={steps.spec}
            svg={svgs.steps}
            description={steps.description}
            table={steps.table}
            minHeight={300}
          />
        </div>
      </div>

      <section className={p.block} id="share" aria-labelledby="share-h">
        <h2 id="share-h">The robbery share fell after 2017</h2>
        <Figure
          id="share-by-year"
          title="Share of these reports that were robberies, by year"
          spec={share.spec}
          svg={svgs.share}
          description={share.description}
          table={share.table}
          minHeight={260}
        />
      </section>

      <section className={p.block} id="lenses" aria-labelledby="lenses-h">
        <h2 id="lenses-h">Three ways in</h2>
        <ul className={p.lenses}>
          {LENSES.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className={p.lens}>
                <span className={p.lensName}>{l.name}</span>
                <span className={p.lensText}>{l.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className={p.tail}>
        <div className={p.band}>
          <p>The full method and results, in a short paper.</p>
          <Link to="/paper" className={`${ui.btn} ${ui.btnPrimary}`}>Read the paper</Link>
        </div>
        <p>Counts are reported incidents, not risk.</p>
      </div>
    </>
  )
}
