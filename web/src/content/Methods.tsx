import { Callout } from '../components/Callout.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { Section } from '../components/Section.tsx'
import { getValue, useResults } from '../lib/results.ts'
import ui from '../components/ui.module.css'

const X = 'explain.sta303_v2'
const A = 'predict.ablation'
const TOC = [
  ['data', 'Data'],
  ['variables', 'Variables'],
  ['methods', 'Methods'],
  ['explorer', 'Explorer data'],
  ['limitations', 'Limitations'],
  ['reproducibility', 'Reproducibility'],
]
const STEPS = [
  ['log.source_rows', 'Rows in the four Toronto Police files'],
  ['log.rows_outside_2014_2023_or_invalid_date', 'Removed: occurrence outside 2014 to 2023, or an invalid date'],
  ['log.cross_category_conflict_events_dropped', 'Events removed because the same event is labelled robbery and another type'],
  ['log.ledger_final_rows', 'Rows in the unified table'],
  ['log.nsa_rows_dropped', 'Removed from the model: no neighbourhood (NSA)'],
  ['log.model_rows', 'Rows used by the inference model'],
] as const

export function Methods() {
  const data = useResults()
  const evaluation = getValue(data, `${A}:evaluation`) as Record<string, string>
  const keys = Object.entries(data.results)
  return (
    <>
      <PageHeader
        eyebrow="Methods"
        title="Every result here comes from one validated pipeline whose ports reproduce the three course projects before anything is improved."
        dek="The definition, the data steps, the models and the checks, with the limits stated up front."
        sources={[X, A]}
      />
      <div className={ui.withToc}>
        <nav className={ui.toc} aria-label="On this page">
          <ol>
            {TOC.map(([id, label]) => (
              <li key={id}><a href={`#${id}`} data-pinned={id === 'limitations'}>{label}</a></li>
            ))}
          </ol>
        </nav>
        <div>
          <Section id="data" title="Data">
            <div className="prose">
              <p>
                <strong>The task.</strong> Predict which major crime type a reported incident is: the positive class is robbery, the negative class is auto theft, break and enter or
                theft over. The quantity is P(robbery | reported incident), not the risk of robbery at a place or time. Assault, bicycle theft, homicide and shootings are excluded
                by rule, and the window is 2014 to 2023.
              </p>
              <p>
                <strong>Sources.</strong> The Toronto Police Service Public Safety Data Portal major crime indicator files (robbery, auto theft, break and enter, theft over), Toronto
                neighbourhood boundaries and census income measures. Data are open data released under the Open Government Licence – Toronto; the files are fetched and
                checked against recorded checksums, never committed.
              </p>
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <DataTable
                caption="How the unified table is built (counts logged by the pipeline)"
                rowKey={(r) => r[0]}
                columns={[
                  { key: 'step', header: 'Step', render: (r) => r[1] },
                  { key: 'n', header: 'Count', num: true, render: (r) => <Num k={`${X}:${r[0]}`} /> },
                ]}
                rows={[...STEPS]}
              />
            </div>
            <p className="prose" style={{ marginTop: 'var(--space-3)' }}>
              Other rules in the table: exact duplicate rows are removed, and coordinates outside Toronto are dropped. Robberies are <Num k={`${X}:robbery`} /> of the model rows, a share of{' '}
              <Num k={`${X}:robbery_share`} />.
            </p>
          </Section>

          <Section id="variables" title="Variables">
            <div className="prose">
              <p>
                The inference model uses hour of day (24 levels), month, weekday, a post-2019 indicator and solar darkness. The prediction ladder adds premises and location type,
                neighbourhood geography (latitude, longitude, distances) and census measures at the neighbourhood level.
              </p>
            </div>
          </Section>

          <Section id="methods" title="Methods">
            <div className="prose">
              <p>
                <strong>Inference.</strong> A binomial logistic regression of robbery against the other three types, with cluster-robust standard errors by neighbourhood (
                <Num k={`${X}:log.neighbourhoods`} /> clusters), five-fold grouped cross-validation (<Num k={`${X}:cv.folds`} /> folds) and a calibration check.
              </p>
              <p>
                <strong>Prediction.</strong> Five rungs on identical rows: time-only logistic, plus place and premises, plus census, a random forest, and XGBoost. A variant without
                premises and location type is fitted at each rung.
              </p>
              <p><strong>Evaluation.</strong> {evaluation.inner_tuning} {evaluation.threshold} {evaluation.confidence_intervals}</p>
            </div>
          </Section>

          <Section id="explorer" title="Explorer data">
            <div className="prose">
              <p>
                The Explore page filters the 2020 to 2023 robbery, theft over and bicycle theft records. Exact duplicate rows are removed, distances use the haversine formula, and
                counts show records and distinct event IDs separately. The browser implementation reproduces the course Shiny application&apos;s counts exactly on a large set of generated
                test cases.
              </p>
            </div>
          </Section>

          <Section id="limitations" title="Limitations">
            <Callout variant="caveat" title="What these results cannot say">
              <ul>
                <li>Counts are reported incidents. They are not exposure-adjusted and not a measure of safety or risk.</li>
                <li>The post-2019 term absorbs every change after 2019, including reporting practice and the mix of other crime types.</li>
                <li>Premises and location type partly define the crime type, so the lift from place is partly built into the labels.</li>
                <li>Neighbourhood-level census measures describe areas, not the people involved.</li>
                <li>The time-only models separate the classes weakly even where many time terms are statistically clear.</li>
                <li>The Explorer uses the nearest listed station, not the nearest station.</li>
              </ul>
            </Callout>
          </Section>

          <Section id="reproducibility" title="Reproducibility">
            <div className="prose">
              <p>
                One command rebuilds everything (<code>make all</code>). The global seed is <Num k={`${X}:cv.seed`} />, every random generator receives it explicitly, and two runs on the same
                machine produce identical result hashes. Each number on this site and in the paper traces to one of these result files:
              </p>
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <DataTable
                caption="Result files behind this site"
                rowKey={(r) => r[0]}
                columns={[
                  { key: 'key', header: 'Key', render: (r) => <code>{r[0]}</code> },
                  { key: 'producer', header: 'Producer', render: (r) => <code>{r[1].producer}</code> },
                  { key: 'sha', header: 'Commit', render: (r) => <code>{r[1].git_sha.slice(0, 7)}</code> },
                ]}
                rows={keys}
              />
            </div>
            <div className="prose" style={{ marginTop: 'var(--space-4)' }}>
              <p>
                <strong>Parity first.</strong> Each course project was re-run in R and ported before any change. Explorer counts match exactly. The inference model matches its coefficients to
                rounding. The six JSC370 models match within stated tolerances and in tier ranking, apart from three deviations recorded in the parity report (the decision tree&apos;s true
                positives, the random forest&apos;s third-ranked feature and XGBoost judged on a ten-seed mean). Improvements came afterwards and are logged one by one.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </>
  )
}
