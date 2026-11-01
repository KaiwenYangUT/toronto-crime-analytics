import { Callout } from '../components/Callout.tsx'
import { CensusScatter } from '../components/census/CensusScatter.tsx'
import type { CensusBand, CensusScatterData } from '../components/census/types.ts'
import { DataTable } from '../components/DataTable.tsx'
import { Disclosure } from '../components/Disclosure.tsx'
import { Figure } from '../components/Figure.tsx'
import { KeyPoints } from '../components/KeyPoints.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { ResultSection } from '../components/ResultSection.tsx'
import { StatCard } from '../components/StatCard.tsx'
import { useResults } from '../lib/results.ts'
import type { ChartSvgs } from '../lib/vegaServer.ts'
import { calibrationChart, censusScatter2d as flatScatter, forestPlot, oddsByTime, postByComparator } from '../lib/specs.ts'
import e from './explain.module.css'

export type ExplainSvgs = Record<'after' | 'time' | 'scatter', ChartSvgs>

const K = 'explain.sta303_v2'
const E = 'predict.eda_corrections:claims'
const C = 'predict.census_scatter'

const FIFTH = ['Lowest', 'Second', 'Middle', 'Fourth', 'Highest']

/** The five groups behind the plain-language bullets, for readers who want the values. */
function BandTable({ caption, group, bands, unit }: { caption: string; group: string; bands: 'income_bands' | 'ratio_bands'; unit: 'income' | 'ratio' }) {
  const rows = (useResults().results[C].values as CensusScatterData).summary[bands]
  const cell = (b: CensusBand, f: string) => <Num k={`${C}:summary.${bands}.${b.band - 1}.${f}`} />
  return (
    <DataTable
      caption={caption}
      rowKey={(b: CensusBand) => String(b.band)}
      rows={rows}
      columns={[
        { key: 'fifth', header: group, render: (b) => FIFTH[b.band - 1] },
        { key: 'range', header: unit === 'income' ? 'Median income (CAD)' : 'Job ratio', render: (b) => <span>{unit === 'income' && '$'}{cell(b, 'low')} to {unit === 'income' && '$'}{cell(b, 'high')}</span> },
        { key: 'n', header: 'Group size', num: true, render: (b) => cell(b, 'n') },
        { key: 'median', header: 'Median robberies', num: true, render: (b) => cell(b, 'median_robberies') },
        { key: 'max', header: 'Largest count', num: true, render: (b) => cell(b, 'max_robberies') },
      ]}
    />
  )
}

export function Explain({ svgs }: { svgs: ExplainSvgs }) {
  const data = useResults()
  const after = postByComparator(data)
  const time = oddsByTime(data)
  const forest = forestPlot(data)
  const scatter = flatScatter(data)
  const calibration = calibrationChart(data)
  const census = data.results[C].values as CensusScatterData
  const yongeEast = census.points.findIndex((p) => p.name === 'Downtown Yonge East')
  const ci = (base: string) => (
    <>
      95% interval <Num k={`${K}:${base}.robust_or_lo`} /> to <Num k={`${K}:${base}.robust_or_hi`} />
    </>
  )
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
            subtitle="Odds: robberies per other incident. One means no difference."
            spec={after.spec}
            svg={svgs.after}
            description={after.description}
            table={after.table}
            minHeight={250}
            caption={
              <>
                <Num k={`${K}:n`} /> reported incidents. Bars show 95% intervals, the range the data reasonably support.
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
              meaning="Against 2014 to 2019, with hour, month, weekday and darkness held fixed (compared like for like)."
              notMean={
                <>
                  It does not say robberies fell or other types rose. The size depends on the comparison: <Num k={`${K}:composition.Auto Theft.post2019.or`} /> against auto theft,{' '}
                  <Num k={`${K}:composition.Break and Enter.post2019.or`} /> against break and enter. It also absorbs anything else that changed after 2019, such as reporting.
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
            subtitle="Against noon, January and Monday (open markers). Bars show 95% intervals."
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
            meaning="The model's measured-darkness effect: dark against light dates at the same hour."
            notMean={
              <>
                It describes reported incidents only, and comes only from hours that are dark on some dates and light on others. A plain night-versus-day split of the raw data shows robbery shares of <Num k={`${E}.darkness.dark_share`} /> and <Num k={`${E}.darkness.light_share`} />, because night and day differ in other ways.
              </>
            }
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
        <Disclosure id="all-terms" title="Show all model terms">
          <div className={e.half}>
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
        <Disclosure id="model-checks" title="Show model fit">
          <div className={e.half}>
            <ul className={e.fitList}>
              <li>
                On random five-fold splits, the model ranks a robbery above another incident <Num k={`${K}:cv.auc_mean`} /> of the time. Guessing scores one half.
              </li>
              <li>
                Of <Num k="predict.inference_vs_prediction:time_terms" /> time terms, <Num k="predict.inference_vs_prediction:time_terms_clear" /> are statistically clear (their 95% interval excludes no difference), yet the separation is weak.
              </li>
              <li>These splits are not grouped by neighbourhood, so the score is not comparable with the Predict page.</li>
            </ul>
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

      <ResultSection
        id="income"
        title="In 2020, lower-income neighbourhoods reported more robberies; the job ratio shows no consistent pattern."
        figure={<CensusScatter data={census} spec={scatter.spec} svgs={svgs.scatter} />}
        below={
          <div className={e.guide}>
            <h3 className={e.guideTitle}>Add a third axis</h3>
            <KeyPoints
              label="How to use the three-dimensional view"
              items={[
                { text: 'Press Rotate in three dimensions under the plot. The robbery count becomes the upright axis, so taller points are neighbourhoods with more reported robberies.' },
                { text: 'Drag to turn the view, scroll or pinch to zoom, and press Reset view to start again. On a phone or tablet, press Interact first so the page still scrolls.' },
                { text: 'Look for a few tall points among many low ones, and check whether the tall points sit on the low-income side or at one job ratio. Hover or tap a point to name it.' },
              ]}
            />
          </div>
        }
        aside={
          <>
            <KeyPoints
              items={[
                {
                  text: (
                    <>
                      Lower-income neighbourhoods reported more robberies. The median count falls from <Num k={`${C}:summary.income_bands.0.median_robberies`} /> in the lowest-income fifth to <Num k={`${C}:summary.income_bands.4.median_robberies`} /> in the highest.
                    </>
                  ),
                },
                {
                  text: (
                    <>
                      The job ratio shows no consistent pattern. The median is <Num k={`${C}:summary.ratio_bands.0.median_robberies`} /> in the lowest fifth and <Num k={`${C}:summary.ratio_bands.1.median_robberies`} /> to <Num k={`${C}:summary.ratio_bands.2.median_robberies`} /> in the other four, and the highest counts occur at every ratio.
                    </>
                  ),
                },
                {
                  text: (
                    <>
                      The largest counts are a few central neighbourhoods: {census.summary.max.name} (<Num k={`${C}:summary.max.robberies`} />) and Downtown Yonge East (<Num k={`${C}:points.${yongeEast}.robberies`} />).
                    </>
                  ),
                },
              ]}
            />
            <p className={e.note}>
              Fifths: all <Num k={`${C}:summary.n`} /> neighbourhoods ranked, then cut into five groups of about equal size. Median: the middle value. Job ratio: permanent jobs per member of the labour force.
            </p>
            <Callout variant="caveat" title="Counts, not rates">
              <p>
                This 2020 extract has <Num k={`${C}:summary.total_robberies`} /> robberies, more than the <Num k={`${K}:category_by_year.2020.Robbery`} /> in the cleaned table used elsewhere. Counts of reported incidents, not per resident and not risk.
              </p>
            </Callout>
          </>
        }
      >
        <Disclosure id="income-groups" title="Show the five groups">
          <div className={e.half}>
            <BandTable caption="Robbery counts by fifth of median income" group="Income fifth" bands="income_bands" unit="income" />
            <BandTable caption="Robbery counts by fifth of job ratio" group="Job-ratio fifth" bands="ratio_bands" unit="ratio" />
          </div>
        </Disclosure>
      </ResultSection>
    </>
  )
}
