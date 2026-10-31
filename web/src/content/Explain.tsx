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
import { calibrationChart, censusScatter2d as flatScatter, forestPlot, oddsByTime, patternChart, postByComparator } from '../lib/specs.ts'
import r from './resultPages.module.css'

export type ExplainSvgs = Record<'after' | 'time' | 'scatter' | 'weekday' | 'hour', ChartSvgs>

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
  const after = postByComparator(data)
  const time = oddsByTime(data)
  const forest = forestPlot(data)
  const scatter = flatScatter(data)
  const calibration = calibrationChart(data)
  const chart = patternChart(data, pattern)
  const census = data.results[C].values as CensusScatterData
  const ci = (base: string) => (
    <>
      95% interval <Num k={`${K}:${base}.robust_or_lo`} /> to <Num k={`${K}:${base}.robust_or_hi`} />
    </>
  )
  const patterns = [
    {
      claim: 'summer_rise',
      pattern: 'Robberies rise in summer',
      evidence: (
        <>
          Share <Num k={`${E}.summer_rise.summer_share`} /> in summer, <Num k={`${E}.summer_rise.winter_share`} /> in winter. Ten-year model: July is <Num k={`${K}:month_or_vs_jan.7.or`} /> against January.
        </>
      ),
    },
    {
      claim: 'weekend_peak',
      pattern: 'Robberies are higher at weekends',
      evidence: (
        <>
          Friday and Saturday tie for most (<Num k={`${E}.weekend_peak.robberies_by_day.Fri`} /> and <Num k={`${E}.weekend_peak.robberies_by_day.Sat`} />); Sunday has fewest (<Num k={`${E}.weekend_peak.robberies_by_day.Sun`} />).
        </>
      ),
    },
    {
      claim: 'darkness',
      pattern: 'Robberies are more likely after dark',
      evidence: (
        <>
          <Num k={`${E}.darkness.dark_share`} /> of incidents from 6pm to 6am, <Num k={`${E}.darkness.light_share`} /> by day: no clear difference. A clock cut-off, not measured darkness.
        </>
      ),
    },
    {
      claim: 'hourly_shape',
      pattern: 'Counts fall steadily through the morning, then the afternoon and evening',
      evidence: (
        <>
          Counts rose <Num k={`${E}.hourly_shape.rises_between_1am_and_11am`} /> times between 1am and 11am and <Num k={`${E}.hourly_shape.rises_between_1pm_and_11pm`} /> times between 1pm and 11pm.
        </>
      ),
    },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Explain · what shifts the mix"
        title="Robbery was a smaller share of reported major property crime after 2019."
        dek={
          <>
            Robbery against the other three major property crimes, 2014 to 2023: reported incidents, not risk.
          </>
        }
      />

      <ResultSection
        id="after-2019"
        title="The drop is biggest against auto theft, smallest against break and enter."
        figure={
          <Figure
            id="after-2019-odds"
            title="Odds of a robbery after 2019, by comparison"
            subtitle="Odds: how likely an incident is a robbery."
            spec={after.spec}
            svg={svgs.after}
            description={after.description}
            table={after.table}
            minHeight={250}
            caption={
              <>
                <Num k={`${K}:n`} /> reported incidents. Bars: 95% intervals. Hour, month, weekday and darkness are held fixed.
              </>
            }
          />
        }
        aside={
          <>
            <StatCard
              label="After 2019, all three types"
              value={<Num k={`${K}:post2019.or`} />}
              unit="times the odds of a robbery"
              ci={ci('post2019')}
              meaning="Against 2014 to 2019, with hour, month, weekday and darkness held fixed."
              notMean={
                <>
                  It does not say robberies fell or other types rose. The size depends on the comparison: <Num k={`${K}:composition.Auto Theft.post2019.or`} /> against auto theft alone,{' '}
                  <Num k={`${K}:composition.Break and Enter.post2019.or`} /> against break and enter. It also holds anything else that changed after 2019, such as reporting.
                </>
              }
            />
            <KeyPoints
              items={[
                { text: <>Reported auto thefts rose from <Num k={`${K}:category_by_year.2019.Auto Theft`} /> in 2019 to <Num k={`${K}:category_by_year.2023.Auto Theft`} /> in 2023.</> },
                { text: <>Reported robberies went from <Num k={`${K}:category_by_year.2019.Robbery`} /> to <Num k={`${K}:category_by_year.2023.Robbery`} />.</> },
              ]}
            />
          </>
        }
      />

      <ResultSection
        id="time"
        title="The hour of day matters most; month and weekday move the odds much less."
        figure={
          <Figure
            id="odds-by-time"
            title="Odds of a robbery by hour, month and weekday"
            subtitle="Against noon, January and Monday (open markers). Bars: 95% intervals."
            spec={time.spec}
            svg={svgs.time}
            description={time.description}
            table={time.table}
            minHeight={340}
            caption={
              <>
                Noon is an unusual reference hour: only <Num k={`${E}.hourly_shape.robbery_share_by_hour.12`} /> of its 2020 incidents were robberies, against <Num k={`${E}.hourly_shape.robbery_share_by_hour.11`} /> at 11am.
              </>
            }
          />
        }
        aside={
          <StatCard
            label="After dark"
            value={<Num k={`${K}:dark.or`} />}
            unit="times the odds of a robbery"
            ci={ci('dark')}
            meaning="Measured darkness at a fixed hour. The table below uses a clock cut-off instead."
            notMean="It describes reported incidents only, and it comes only from hours that are dark on some dates and light on others. It does not show why robberies change after dark."
          />
        }
        below={
          <KeyPoints
            items={[
              { stat: <>×<Num k={`${K}:hour_or_vs_12.15.or`} /></>, text: ' the odds at 3pm against noon, the largest hourly ratio.' },
              { text: <>Month and weekday ratios sit closer to one; December is lowest at ×<Num k={`${K}:month_or_vs_jan.12.or`} />.</> },
            ]}
          />
        }
      >
        <Disclosure id="all-terms" title="See every term in the model">
          <div className={r.half}>
            <Figure
              id="forest"
              title="Every odds ratio in the model"
              subtitle="95% intervals; the highlighted terms are discussed above."
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
        title="In 2020, lower-income neighbourhoods reported somewhat more robberies; the job ratio showed no link."
        figure={<CensusScatter data={census} spec={scatter.spec} svgs={svgs.scatter} />}
        aside={
          <>
            <KeyPoints
              items={[
                {
                  stat: <Num k={`${C}:summary.spearman_income.rho`} />,
                  text: (
                    <>
                      {' '}A weak link across <Num k={`${C}:summary.n`} /> neighbourhoods (p <Num k={`${C}:summary.spearman_income.p`} />); zero would mean none.
                    </>
                  ),
                },
                {
                  stat: <Num k={`${C}:summary.spearman_ratio.rho`} />,
                  text: ' The job ratio (permanent jobs per worker) shows no link.',
                },
              ]}
            />
            <Callout variant="info" title="What the original report said">
              <p>It expected low income and a high job ratio. Income holds weakly; the job ratio does not.</p>
            </Callout>
            <Callout variant="caveat" title="Counts, not rates">
              <p>
                The 2020 course extract has <Num k={`${C}:summary.total_robberies`} /> robberies, the cleaned table <Num k={`${K}:category_by_year.2020.Robbery`} />. Counts of reported incidents, not rates or risk.
              </p>
            </Callout>
          </>
        }
      />

      <ResultSection
        id="patterns"
        title="Four patterns from the course report do not hold in the 2020 data."
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
          <Callout variant="caveat" title="Counts from one pandemic year">
            <p>Changes through 2020 may reflect the pandemic. These are reported incidents, not risk.</p>
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
            subtitle={`Robbery share of reported incidents ${pattern === 'weekday' ? 'by weekday' : 'by hour (the table checks counts)'}, 2020 course data.`}
            spec={chart.spec}
            svg={svgs[pattern]}
            description={chart.description}
            table={chart.table}
            minHeight={260}
          />
        </div>
        <Disclosure id="model-checks" title="How well the model's probabilities match what happened">
          <div className={r.half}>
            <p className={r.note}>
              On random five-fold splits (not grouped by neighbourhood, so not comparable with the Predict scores), the model ranks a robbery above another incident <Num k={`${K}:cv.auc_mean`} /> of the time on a zero-to-one scale, where guessing scores one half.
              Although <Num k="predict.inference_vs_prediction:time_terms_clear" /> of <Num k="predict.inference_vs_prediction:time_terms" /> time terms are clear, that is a weak separation.
            </p>
            <Figure
              id="calibration"
              title="Predicted probabilities match the observed robbery share"
              subtitle="Ten groups of incidents ordered by predicted probability; the dashed line is a perfect match."
              spec={calibration.spec}
              description={calibration.description}
              table={calibration.table}
              minHeight={340}
            />
          </div>
        </Disclosure>
      </ResultSection>
    </>
  )
}
