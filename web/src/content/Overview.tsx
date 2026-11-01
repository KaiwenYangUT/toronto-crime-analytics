import { Link } from 'react-router'
import { Callout } from '../components/Callout.tsx'
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

const D = (d: string) => `${A}:designs.${DESIGN_A}.deltas.${d}.pr_auc.estimate`
const BASE = `${A}:designs.${DESIGN_A}.L0.pr_auc_baseline`

/** What each bar's model is given, in the order of the bars (pipeline/src/tca/predict/ablation.py: time, geo, premises and census blocks). */
const MODELS = [
  { name: 'Time only', text: 'hour, weekday, month and whether it was dark.' },
  { name: 'Time and type of place', text: 'adds premises and location type (a street or shop, say) and coordinates.' },
  { name: 'Full model', text: 'adds neighbourhood census data and XGBoost, a stronger method.' },
  { name: 'Full model, no type of place', text: 'the full model without premises and location type.' },
]

const LENSES = [
  { to: '/explore', name: 'Explore', text: 'Filter incidents on a map.' },
  { to: '/explain', name: 'Explain', text: 'What changes the odds.' },
  { to: '/predict', name: 'Predict', text: 'How well models tell types apart.' },
]

export function Overview({ svgs }: { svgs: OverviewSvgs }) {
  const data = useResults()
  const steps = stepChart(data)
  const share = shareByYear(data, { labelSize: null })
  return (
    <>
      <PageHeader
        eyebrow="Toronto Police open data · 2014 to 2023"
        title="Robbery or other property crime? The type of place says far more than time."
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
                    PR-AUC from time alone: only modestly above guessing, which scores <Num k={BASE} />. With the type of place and the rest, the full model reaches <Num k={v('L5', 'pr_auc', 'estimate')} />.
                  </>
                ),
              },
              { stat: <Num k={`${X}:post2019.or`} />, text: <>times the odds of a robbery in 2020 to 2023 compared with 2014 to 2019. Odds are robberies per other incident.</> },
              {
                stat: <Num k={`${C}:summary.income_bands.0.median_robberies`} />,
                text: (
                  <>
                    robberies in a typical lower-income neighbourhood in 2020, against <Num k={`${C}:summary.income_bands.4.median_robberies`} /> in a typical higher-income one. <Link className={p.textLink} to="/explain#income">See Explain</Link>
                  </>
                ),
              },
            ]}
          />
          <Callout variant="caveat" title="Partly built in">
            <p>
              Type of place partly defines the crime types: <Num k={D('L2_minus_L2-nopremises')} /> of the <Num k={D('L2_minus_L1')} /> gain from the first bar to the second comes from it.
            </p>
          </Callout>
        </div>
        <div className={p.landingVisual}>
          <Figure
            id="what-tells-apart"
            title="What tells robbery apart"
            subtitle="PR-AUC is a score from zero to one for finding robberies without false alarms. Tested on new neighbourhoods; lines are 95% intervals, grey ticks are guessing."
            spec={steps.spec}
            svg={svgs.steps}
            description={steps.description}
            table={steps.table}
            minHeight={300}
          />
          <div className={p.modelsBox} id="models">
            <p className={p.modelsTitle}>The models</p>
            <dl className={p.models}>
              {MODELS.map((m) => (
                <div key={m.name} className={p.model}>
                  <dt>{m.name}</dt>
                  <dd>{m.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <section className={p.block} id="share" aria-labelledby="share-h">
        <h2 id="share-h">The robbery share has fallen every year since 2017</h2>
        <Figure
          id="share-by-year"
          title="Robbery share of reported incidents, by year"
          subtitle="The odds above compare 2020 to 2023 with 2014 to 2019."
          spec={share.spec}
          svg={svgs.share}
          description={share.description}
          table={share.table}
          minHeight={260}
        />
      </section>

      <section className={p.block} id="lenses" aria-labelledby="lenses-h">
        <h2 id="lenses-h">Where to go next</h2>
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
          <p>Read the full method and results in the paper.</p>
          <Link to="/paper" className={`${ui.btn} ${ui.btnPrimary}`}>Read the paper</Link>
        </div>
        <p>Counts are reported incidents, not risk.</p>
      </div>
    </>
  )
}
