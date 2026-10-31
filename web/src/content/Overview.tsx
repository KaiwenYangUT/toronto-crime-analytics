import { Link } from 'react-router'
import { Callout } from '../components/Callout.tsx'
import { Figure } from '../components/Figure.tsx'
import { CardGrid, FindingCard } from '../components/FindingCard.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { Section } from '../components/Section.tsx'
import { useResults } from '../lib/results.ts'
import type { ChartSvgs } from '../lib/vegaServer.ts'
import { DESIGN_A, shareByYear } from '../lib/specs.ts'
import ui from '../components/ui.module.css'

const X = 'explain.sta303_v2'
const A = 'predict.ablation'
const v = (rung: string, m: string, f: string) => `${A}:designs.${DESIGN_A}.variants.${rung}.${m}.${f}`

export function Overview({ svg }: { svg: ChartSvgs }) {
  const data = useResults()
  const share = shareByYear(data)
  return (
    <>
      <PageHeader
        eyebrow="Toronto Police open data · 2014 to 2023"
        title="Premises and location type say far more about whether an incident is a robbery than the time does."
        dek={
          <>
            Among <Num k={`${X}:n`} /> reported incidents, which crime type is it? An answer about reports, not risk.
          </>
        }
        sources={[X, A]}
      />

      <CardGrid>
        <FindingCard
          label="Explain · after 2019"
          value={<Num k={`${X}:post2019.or`} />}
          unit="times the odds of being a robbery"
          ci={<>95% CI <Num k={`${X}:post2019.robust_or_lo`} /> to <Num k={`${X}:post2019.robust_or_hi`} /> (cluster-robust)</>}
          meaning="After 2019 a reported incident was much less likely to be a robbery, with hour, month, weekday and darkness held fixed."
          notMean="It does not say robberies fell by that factor: the other crime types changed too."
          sourceKey={`${X}:post2019`}
          to="/explain"
        />
        <FindingCard
          label="Predict · time alone vs the full model"
          value={<><Num k={v('L1', 'pr_auc', 'estimate')} /> to <Num k={v('L5', 'pr_auc', 'estimate')} /></>}
          unit="PR-AUC, grouped cross-validation"
          ci={<>Intervals <Num k={v('L1', 'pr_auc', 'lo')} /> to <Num k={v('L1', 'pr_auc', 'hi')} />, then <Num k={v('L5', 'pr_auc', 'lo')} /> to <Num k={v('L5', 'pr_auc', 'hi')} /></>}
          meaning="Time of day, month and weekday leave a model close to the baseline; adding premises, location, census and a stronger model roughly triples the score."
          notMean="It is not a forecast of where robberies will happen."
          sourceKey={A}
          to="/predict"
        />
        <FindingCard
          label="Predict · without premises"
          value={<Num k={v('L5-nopremises', 'pr_auc', 'estimate')} />}
          unit="PR-AUC of the full model without premises and location type"
          ci={<>95% CI <Num k={v('L5-nopremises', 'pr_auc', 'lo')} /> to <Num k={v('L5-nopremises', 'pr_auc', 'hi')} /></>}
          meaning="Take premises and location type away and the best model scores far below its full-model value."
          notMean="Premises partly define the crime type, so this measures what information separates the classes."
          sourceKey={A}
          to="/predict#ladder"
        />
      </CardGrid>

      <Section id="share" title="The robbery share of these reports fell after 2017">
        <Figure
          id="share-by-year"
          title="Robberies were a fifth of these reports in 2014 and about a tenth in 2023"
          subtitle="Share of reported robbery, auto theft, break and enter and theft over incidents that were robberies, by year."
          spec={share.spec}
          svg={svg}
          description={share.description}
          table={share.table}
          minHeight={260}
          source={<>Source: <code>{X}</code>.</>}
        />
      </Section>

      <Section id="lenses" title="One dataset, three lenses">
        <div className={ui.strip}>
          <div className={ui.stripItem}>
            <h3><Link to="/explore">Explore</Link></h3>
            <p>Filter reported incidents by place, weekday, hour and crime type on a map and see the counts change.</p>
          </div>
          <div className={ui.stripItem}>
            <h3><Link to="/explain">Explain</Link></h3>
            <p>Which differences in timing are statistically clear, as odds ratios with honest intervals.</p>
          </div>
          <div className={ui.stripItem}>
            <h3><Link to="/predict">Predict</Link></h3>
            <p>How well can a model tell the crime types apart, and which information does it use?</p>
          </div>
        </div>
      </Section>

      <Section id="paper" title="The paper">
        <div className={ui.cta}>
          <p className="prose">A short research paper reports the explanation and the prediction ladder in full, with methods and limitations.</p>
          <Link to="/paper" className={`${ui.btn} ${ui.btnPrimary}`}>Read the paper</Link>
        </div>
      </Section>

      <Section id="caveat" title="How to read these numbers">
        <Callout variant="caveat" title="Counts are reported incidents, not risk">
          <p>
            Everything here describes which crime type a reported incident is. Reporting changes over time, incidents are not adjusted for how many people or properties are
            exposed, and an association is not a cause.
          </p>
        </Callout>
      </Section>
    </>
  )
}
