import { useState } from 'react'
import { Callout } from '../components/Callout.tsx'
import { CensusScatter } from '../components/census/CensusScatter.tsx'
import type { CensusScatterData } from '../components/census/types.ts'
import { DataTable } from '../components/DataTable.tsx'
import { Disclosure } from '../components/Disclosure.tsx'
import { Figure } from '../components/Figure.tsx'
import { KeyPoints } from '../components/KeyPoints.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { ResultSection } from '../components/ResultSection.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { StatCard } from '../components/StatCard.tsx'
import { getValue, useResults, type PageResults } from '../lib/results.ts'
import type { ChartSvgs } from '../lib/vegaServer.ts'
import { calibrationChart, censusScatter2d as flatScatter, forestPlot, oddsByTime, patternChart } from '../lib/specs.ts'
import r from './resultPages.module.css'

export type ExplainSvgs = Record<'time' | 'scatter' | 'weekday' | 'hour', ChartSvgs>

const K = 'explain.sta303_v2'
const E = 'predict.eda_corrections:claims'
const C = 'predict.census_scatter'

type Verdict = 'holds' | 'partly' | 'fails'
const VERDICT: Record<Verdict, { label: string; glyph: string; cls: string }> = {
  holds: { label: 'Holds', glyph: '✓', cls: r.chipHolds },
  partly: { label: 'Partly', glyph: '◐', cls: r.chipPartly },
  fails: { label: 'Does not hold', glyph: '✕', cls: r.chipFails },
}

/** The checked claim's verdict from the results: kept as stated, partly (some part of it holds) or contradicted. */
function verdictOf(d: PageResults, claim: string): Verdict {
  if (!getValue(d, `${E}.${claim}.contradicted`)) return 'holds'
  const parts = (getValue(d, `${E}.${claim}`) as { claim_parts?: Record<string, boolean> }).claim_parts
  return parts && Object.values(parts).some(Boolean) ? 'partly' : 'fails'
}

function Chip({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict]
  return (
    <span className={`${r.chip} ${v.cls}`}>
      <span className={r.chipGlyph} aria-hidden="true">{v.glyph}</span>
      {v.label}
    </span>
  )
}

export function Explain({ svgs }: { svgs: ExplainSvgs }) {
  const data = useResults()
  const [pattern, setPattern] = useState<'weekday' | 'hour'>('weekday')
  const time = oddsByTime(data)
  const forest = forestPlot(data)
  const scatter = flatScatter(data)
  const calibration = calibrationChart(data)
  const chart = patternChart(data, pattern)
  const census = data.results[C].values as CensusScatterData
  const patterns = [
    {
      claim: 'summer_rise',
      pattern: 'Robberies rise in summer',
      evidence: (
        <>
          The robbery share was <Num k={`${E}.summer_rise.summer_share`} /> in summer against <Num k={`${E}.summer_rise.winter_share`} /> in winter.
        </>
      ),
    },
    {
      claim: 'weekend_peak',
      pattern: 'Robberies are higher at weekends',
      evidence: (
        <>
          Not on average: Friday and Saturday tie for the most robberies (<Num k={`${E}.weekend_peak.robberies_by_day.Fri`} /> and <Num k={`${E}.weekend_peak.robberies_by_day.Sat`} />), and Sunday has the fewest (<Num k={`${E}.weekend_peak.robberies_by_day.Sun`} />).
          Saturday does have the highest robbery share, <Num k={`${E}.weekend_peak.robbery_share_by_day.Sat`} />.
        </>
      ),
    },
    {
      claim: 'darkness',
      pattern: 'Robberies are more likely after dark',
      evidence: (
        <>
          <Num k={`${E}.darkness.dark_share`} /> of after-dark incidents were robberies, against <Num k={`${E}.darkness.light_share`} /> in daylight.
        </>
      ),
    },
    {
      claim: 'hourly_shape',
      pattern: 'Counts fall steadily from 1am to 11am and from 1pm to 11pm',
      evidence: (
        <>
          They kept going up and down. Hour to hour, counts rose <Num k={`${E}.hourly_shape.rises_between_1am_and_11am`} /> times in the morning span and <Num k={`${E}.hourly_shape.rises_between_1pm_and_11pm`} /> times in the evening span.
        </>
      ),
    },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Explain · inference"
        title="After 2019, a reported incident was much less likely to be a robbery."
        dek={
          <>
            Odds of robbery against other major property crime in <Num k={`${K}:n`} /> reported incidents from 2014 to 2023. The figures are adjusted odds ratios, not probability ratios, and show an association, not a measure of risk.
          </>
        }
      />

      <ResultSection
        id="time"
        title="The hour of day moves the odds most; month and weekday barely do."
        figure={
          <Figure
            id="odds-by-time"
            title="Odds of robbery by hour, month and weekday"
            subtitle="Against noon, January and Monday (open markers). Bars: robust 95% intervals."
            spec={time.spec}
            svg={svgs.time}
            description={time.description}
            table={time.table}
            minHeight={340}
            caption="An odds ratio compares the odds of a robbery with a reference group: one means no difference."
          />
        }
        aside={
          <>
            <StatCard
              label="After 2019"
              value={<Num k={`${K}:post2019.or`} />}
              unit="times the odds of a robbery"
              ci={
                <>
                  Cluster-robust 95% CI <Num k={`${K}:post2019.robust_or_lo`} /> to <Num k={`${K}:post2019.robust_or_hi`} />
                </>
              }
              meaning="Against 2014 to 2019, at the same hour, month, weekday and darkness."
              notMean="It does not say whether robberies fell or other reports rose; the size depends on the comparison group."
            />
            <StatCard
              label="After dark"
              value={<Num k={`${K}:dark.or`} />}
              unit="times the odds of a robbery"
              ci={
                <>
                  Cluster-robust 95% CI <Num k={`${K}:dark.robust_or_lo`} /> to <Num k={`${K}:dark.robust_or_hi`} />
                </>
              }
              meaning="A small difference once the hour is already in the model."
              notMean="It describes reported incidents only; it does not show that darkness explains robberies."
            />
          </>
        }
        below={
          <KeyPoints
            items={[
              { stat: <>×<Num k={`${K}:hour_or_vs_12.15.or`} /></>, text: ' the odds at 15:00 against noon, the largest hourly ratio.' },
              { text: 'Month and weekday ratios stay much closer to one.' },
            ]}
          />
        }
      >
        <Disclosure id="all-terms" title="Show all model terms">
          <div className={r.half}>
            <Figure
              id="forest"
              title="Every odds ratio in the model"
              subtitle="Cluster-robust 95% intervals; the highlighted terms are discussed above."
              spec={forest.spec}
              description={forest.description}
              table={forest.table}
              minHeight={760}
            />
          </div>
        </Disclosure>
      </ResultSection>

      <ResultSection
        id="income"
        title="Lower-income neighbourhoods reported somewhat more robberies in 2020; the job ratio shows no pattern."
        figure={<CensusScatter data={census} spec={scatter.spec} svgs={svgs.scatter} />}
        aside={
          <>
            <KeyPoints
              items={[
                {
                  stat: <Num k={`${C}:summary.spearman_income.rho`} />,
                  text: (
                    <>
                      {' '}Rank correlation of robbery count with median income across <Num k={`${C}:summary.n`} /> neighbourhoods: weak, negative (p <Num k={`${C}:summary.spearman_income.p`} />).
                    </>
                  ),
                },
                {
                  stat: <Num k={`${C}:summary.spearman_ratio.rho`} />,
                  text: (
                    <>
                      {' '}With the job ratio: no relationship (p <Num k={`${C}:summary.spearman_ratio.p`} />).
                    </>
                  ),
                },
                {
                  text: (
                    <>
                      The <Num k={`${C}:summary.top_decile.n`} /> neighbourhoods with the most robberies had median income $<Num k={`${C}:summary.top_decile.median_income`} /> against{' '}
                      $<Num k={`${C}:summary.rest.median_income`} /> for the rest, and the same job ratio.
                    </>
                  ),
                },
              ]}
            />
            <Callout variant="info" title="What the original caption said">
              <p>The report saw low income and, surprisingly, a high job ratio. Income holds, weakly; the job ratio is not supported.</p>
            </Callout>
            <Callout variant="caveat" title="Counts, not rates">
              <p>These are reported incidents in 2020, not per resident and not risk.</p>
            </Callout>
          </>
        }
      />

      <ResultSection
        id="patterns"
        title="None of the course report's four patterns holds as stated, though Saturday has the highest robbery share."
        figure={
          <DataTable
            caption="Four patterns from the course report, checked"
            rowKey={(row) => row.claim}
            columns={[
              { key: 'pattern', header: 'Pattern', render: (row) => <span className={r.wrap}>{row.pattern}</span> },
              { key: 'verdict', header: 'Verdict', render: (row) => <Chip verdict={verdictOf(data, row.claim)} /> },
              { key: 'evidence', header: 'Evidence', render: (row) => <span className={r.wrap}>{row.evidence}</span> },
            ]}
            rows={patterns}
          />
        }
        aside={
          <Callout variant="caveat" title="Reported incidents in one year">
            <p>Counts are reported incidents, not risk, from the first pandemic year, so seasonal comparisons are confounded.</p>
          </Callout>
        }
      >
        <div className={r.half}>
          <Segmented
            label="Pattern to chart"
            value={pattern}
            onChange={setPattern}
            options={[{ value: 'weekday', label: 'By weekday' }, { value: 'hour', label: 'By hour' }]}
          />
          <Figure
            id="pattern"
            title={pattern === 'weekday' ? 'Saturday has the highest robbery share; Tuesday and Sunday the lowest' : 'The robbery share jumps between hours instead of following a smooth curve'}
            subtitle={`Share of reported incidents that were robberies, ${pattern === 'weekday' ? 'by weekday' : 'by hour of day'}, 2020 course data.`}
            spec={chart.spec}
            svg={svgs[pattern]}
            description={chart.description}
            table={chart.table}
            minHeight={260}
          />
        </div>
        <Disclosure id="model-checks" title="Model fit and calibration">
          <div className={r.half}>
            <p className={r.note}>
              Five-fold cross-validation gives a ROC-AUC of <Num k={`${K}:cv.auc_mean`} /> (standard deviation <Num k={`${K}:cv.auc_sd`} />), where guessing scores one half. That is a weak separation, although{' '}
              <Num k="predict.inference_vs_prediction:time_terms_clear" /> of <Num k="predict.inference_vs_prediction:time_terms" /> time terms are statistically clear: many small, reliable differences do not make an incident easy to classify.
            </p>
            <Figure
              id="calibration"
              title="Predicted probabilities match the observed robbery share"
              subtitle="Ten groups of incidents ordered by predicted probability; the dashed line is perfect calibration."
              spec={calibration.spec}
              description={calibration.description}
              table={calibration.table}
              minHeight={340}
            />
          </div>
        </Disclosure>
        <Callout variant="caveat" title="Associations among reported incidents">
          <p>
            The model compares the mix of crime types among reported incidents; it is not a measure of risk. The post-2019 term absorbs everything that changed over time, including reporting.
          </p>
        </Callout>
      </ResultSection>
    </>
  )
}
