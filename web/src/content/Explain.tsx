import { useState } from 'react'
import { Callout } from '../components/Callout.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { Disclosure } from '../components/Disclosure.tsx'
import { Figure } from '../components/Figure.tsx'
import { FindingCard } from '../components/FindingCard.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { Section } from '../components/Section.tsx'
import { Segmented } from '../components/Segmented.tsx'
import type { ChartSvgs } from '../lib/vegaServer.ts'
import { useResults } from '../lib/results.ts'
import { calibrationChart, forestPlot, patternChart } from '../lib/specs.ts'
import ui from '../components/ui.module.css'

export type ExplainSvgs = Record<'forest' | 'calibration' | 'weekday' | 'hour', ChartSvgs>

const K = 'explain.sta303_v2'
const E = 'predict.eda_corrections:claims'

export function Explain({ svgs }: { svgs: ExplainSvgs }) {
  const data = useResults()
  const [pattern, setPattern] = useState<'weekday' | 'hour'>('weekday')
  const forest = forestPlot(data)
  const calibration = calibrationChart(data)
  const chart = patternChart(data, pattern)
  return (
    <>
      <PageHeader
        eyebrow="Explain · inference"
        title="After 2019 a reported property-type incident was much less likely to be a robbery."
        dek={
          <>
            Odds ratios from <Num k={`${K}:n`} /> reported incidents, 2014 to 2023, holding hour, month, weekday and darkness fixed: association, not risk or cause.
          </>
        }
        sources={[K, 'predict.eda_corrections']}
      />

      <div className={ui.split}>
        <Figure
          id="forest"
          title="The hour of day moves the odds of robbery most; month and weekday barely do"
          subtitle="Odds ratios with cluster-robust 95% intervals (clustered by neighbourhood); highlighted terms are discussed in the cards."
          spec={forest.spec}
          svg={svgs.forest}
          description={forest.description}
          table={forest.table}
          minHeight={760}
          caption="A ratio above one means a reported incident at that hour, month or weekday was more likely to be a robbery than in the reference category; below one, less likely. Colour is not the only cue: highlighted rows are also labelled."
          source={<>Source: <code>{K}</code> · <Num k={`${K}:n`} /> incidents, <Num k={`${K}:log.neighbourhoods`} /> neighbourhoods.</>}
        />
        <div className={ui.stack}>
          <FindingCard
            label="After 2019 vs 2014 to 2019"
            value={<Num k={`${K}:post2019.or`} />}
            unit="times the odds of being a robbery"
            ci={
              <>
                95% CI <Num k={`${K}:post2019.or_lo`} /> to <Num k={`${K}:post2019.or_hi`} />; cluster-robust <Num k={`${K}:post2019.robust_or_lo`} /> to{' '}
                <Num k={`${K}:post2019.robust_or_hi`} />
              </>
            }
            meaning="Compared with earlier years, a reported incident in the period after 2019 had lower odds of being a robbery, at the same hour, month, weekday and darkness."
            notMean={
              <>
                It cannot say whether robberies fell or other reports rose. Against auto theft alone the odds ratio is{' '}
                <Num k={`${K}:composition.Auto Theft.post2019.or`} />; against break and enter <Num k={`${K}:composition.Break and Enter.post2019.or`} />; against theft over{' '}
                <Num k={`${K}:composition.Theft Over.post2019.or`} />. The size depends on the comparison group.
              </>
            }
            sourceKey={`${K}:post2019`}
          />
          <FindingCard
            label="15:00 vs noon"
            value={<Num k={`${K}:hour_or_vs_12.15.or`} />}
            unit="times the odds of being a robbery"
            ci={
              <>
                Cluster-robust 95% CI <Num k={`${K}:hour_or_vs_12.15.robust_or_lo`} /> to <Num k={`${K}:hour_or_vs_12.15.robust_or_hi`} />
              </>
            }
            meaning="Among incidents reported for mid-afternoon, a larger share were robberies than among those reported for noon."
            notMean="It does not mean robberies are more likely to happen at 15:00. It compares the mix of crime types among reported incidents."
            sourceKey={`${K}:hour_or_vs_12.15`}
          />
          <FindingCard
            label="After dark vs daylight"
            value={<Num k={`${K}:dark.or`} />}
            unit="times the odds of being a robbery"
            ci={
              <>
                Cluster-robust 95% CI <Num k={`${K}:dark.robust_or_lo`} /> to <Num k={`${K}:dark.robust_or_hi`} />
              </>
            }
            meaning="A small association once the hour is already in the model."
            notMean="It does not show that darkness causes robbery. With hour and month as factors, darkness is separated only by twilight hours that are dark on some dates and light on others."
            sourceKey={`${K}:dark`}
          />
        </div>
      </div>

      <Section id="patterns" title="Patterns in the data: four original captions checked">
        <div className={ui.stack}>
          <p className="prose">
            The original course report described four patterns in the <Num k="predict.eda_corrections:year" /> data. The table repeats each caption and
            compares it with the same data. Counts here are reported incidents, not risk.
          </p>
          <DataTable
            caption="Original captions and what the data show"
            rowKey={(r) => r.pattern}
            columns={[
              { key: 'pattern', header: 'Pattern', render: (r) => r.pattern },
              { key: 'original', header: 'Original caption', render: (r) => <span style={{ whiteSpace: 'normal' }}>{r.original}</span> },
              { key: 'data', header: 'What the data show', render: (r) => <span style={{ whiteSpace: 'normal' }}>{r.data}</span> },
            ]}
            rows={[
              {
                pattern: 'Summer rise',
                original: 'Robberies rise in summer, tied to warmer weather and holidays.',
                data: (
                  <>
                    The robbery share was lower in summer (<Num k={`${E}.summer_rise.summer_share`} />) than in winter (
                    <Num k={`${E}.summer_rise.winter_share`} />), and January, February and March were the three busiest months for robberies.
                  </>
                ),
              },
              {
                pattern: 'Weekend peak',
                original: 'Robberies are higher at weekends; Saturday and Thursday have the most incidents.',
                data: (
                  <>
                    Friday and Saturday had the most robberies (<Num k={`${E}.weekend_peak.robberies_by_day.Fri`} /> and <Num k={`${E}.weekend_peak.robberies_by_day.Sat`} />),
                    Sunday the fewest (<Num k={`${E}.weekend_peak.robberies_by_day.Sun`} />), and Wednesday had the most incidents overall.
                  </>
                ),
              },
              {
                pattern: 'After dark',
                original: 'Robberies are more likely after dark.',
                data: (
                  <>
                    By the original 18:00 to 06:00 clock rule, <Num k={`${E}.darkness.dark_share`} /> of after-dark incidents were robberies against{' '}
                    <Num k={`${E}.darkness.light_share`} /> in daylight hours: slightly lower, not higher.
                  </>
                ),
              },
              {
                pattern: 'Hourly shape',
                original: 'Counts follow a smooth shape through the day.',
                data: (
                  <>
                    Counts rise and fall in steps: they rise <Num k={`${E}.hourly_shape.rises_between_1am_and_11am`} /> times between 1am and 11am and{' '}
                    <Num k={`${E}.hourly_shape.rises_between_1pm_and_11pm`} /> times between 1pm and 11pm, rather than declining smoothly.
                  </>
                ),
              },
            ]}
          />
          <Segmented
            label="Pattern to chart"
            value={pattern}
            onChange={setPattern}
            options={[{ value: 'weekday', label: 'By weekday' }, { value: 'hour', label: 'By hour' }]}
          />
          <Figure
            id="pattern"
            title={pattern === 'weekday' ? 'Saturday has the highest robbery share and Sunday the lowest' : 'The robbery share jumps between hours instead of following a smooth curve'}
            subtitle={`Share of reported incidents that were robberies, ${pattern === 'weekday' ? 'by weekday' : 'by hour of day'}, 2020 course data.`}
            spec={chart.spec}
            svg={svgs[pattern]}
            description={chart.description}
            table={chart.table}
            minHeight={260}
            caption="The captions are kept in the parity report as originally written and corrected here."
          />
        </div>
      </Section>

      <Section id="corrected" title="Original model vs corrected model">
        <DataTable
          caption="What changed between the course report and this site"
          rowKey={(r) => r.what}
          columns={[
            { key: 'what', header: 'Item', render: (r) => r.what },
            { key: 'orig', header: 'Original (STA303 report)', render: (r) => <span style={{ whiteSpace: 'normal' }}>{r.orig}</span> },
            { key: 'new', header: 'This site', render: (r) => <span style={{ whiteSpace: 'normal' }}>{r.next}</span> },
          ]}
          rows={[
            { what: 'Model family', orig: 'The final summary table was a linear (Gaussian) model, by accident.', next: 'A binomial logistic regression, reported as odds ratios.' },
            { what: 'Hour, weekday, month', orig: 'Linear numbers; season derived from month.', next: 'Categorical terms (noon, Monday and January as references); season dropped because month already contains it.' },
            { what: 'Period', orig: 'A COVID indicator.', next: 'A post-2019 indicator; it absorbs every change after 2019, so it is not an outbreak effect.' },
            { what: 'Darkness', orig: 'A fixed clock rule, 18:00 to 06:00.', next: 'Solar darkness: the sun below civil twilight at the middle of the local hour.' },
            { what: 'Intervals', orig: 'Model-based only.', next: 'Model-based, plus cluster-robust by neighbourhood.' },
            { what: 'Rows', orig: 'Every complete row, including occurrence years before 2014.', next: <><Num k={`${K}:log.model_rows`} /> incidents from 2014 to 2023.</> },
          ]}
        />
      </Section>

      <Section id="checks" title="Model checks">
        <Disclosure id="model-checks" title="Fit, cross-validation and calibration">
          <div className={ui.stack}>
            <p className="prose">
              Five-fold cross-validation grouped by neighbourhood gives a ROC-AUC of <Num k={`${K}:cv.auc_mean`} /> (standard deviation <Num k={`${K}:cv.auc_sd`} /> across{' '}
              <Num k={`${K}:cv.folds`} /> folds). That is a weak separation, although <Num k="predict.inference_vs_prediction:time_terms_clear" /> of{' '}
              <Num k="predict.inference_vs_prediction:time_terms" /> time terms are statistically clear: many small, reliable differences do not make an incident easy to classify.
            </p>
            <p className="prose">
              Replacing the hour and month factors by a smooth cyclic form raises AIC by <Num k={`${K}:fit.harmonic.delta_aic`} />, so the factor version fits better.
            </p>
            <Figure
              id="calibration"
              title="Predicted probabilities match the observed robbery share"
              subtitle="Ten groups of incidents ordered by predicted probability; the dashed line is perfect calibration."
              spec={calibration.spec}
              svg={svgs.calibration}
              description={calibration.description}
              table={calibration.table}
              minHeight={340}
            />
          </div>
        </Disclosure>
      </Section>

      <Section id="limits" title="Limitations">
        <Callout variant="caveat" title="Read these odds ratios as associations among reported incidents">
          <p>
            The model compares the mix of crime types among incidents that were reported. It says nothing about how risky a place or hour is, and the comparison group (auto
            theft, break and enter, theft over) changes the size of every effect. The post-2019 term absorbs everything that changed over time, including reporting.
          </p>
        </Callout>
      </Section>
    </>
  )
}
