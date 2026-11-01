import { Callout } from '../components/Callout.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { Disclosure } from '../components/Disclosure.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import p from './pages.module.css'

const X = 'explain.sta303_v2'
const TOC = [
  ['data', 'Data'],
  ['task', 'Task'],
  ['models', 'Models'],
  ['explorer', 'Explore counts'],
  ['limitations', 'Limits'],
]
const STEPS = [
  ['log.source_rows', 'Rows in the four police files'],
  ['log.rows_outside_2014_2023_or_invalid_date', 'Removed: outside 2014 to 2023, or invalid date'],
  ['log.rows_outside_toronto_box', 'Removed: coordinates outside Toronto'],
  ['log.exact_duplicate_rows_dropped', 'Removed: exact duplicates'],
  ['log.cross_category_conflict_rows_dropped', 'Removed: rows of events labelled both robbery and another type'],
  ['log.ledger_final_rows', 'Rows in the cleaned table'],
  ['log.nsa_rows_dropped', 'Removed: no neighbourhood'],
  ['log.model_rows', 'Rows used by the models'],
] as const

export function Methods() {
  return (
    <>
      <PageHeader eyebrow="Methods" title="One cleaned dataset of reported incidents feeds the Explain and Predict models." />
      <div className={p.pageGrid}>
        <nav className={`${p.pageAside} ${p.asideFirst}`} aria-label="On this page">
          <div className={p.onThis}>
            <p className={p.onThisTitle}>On this page</p>
            <ol>
              {TOC.map(([id, label]) => (
                <li key={id}><a href={`#${id}`}>{label}</a></li>
              ))}
            </ol>
          </div>
        </nav>

        <div className={p.pageMain}>
          <section id="data" aria-labelledby="data-h" className={p.stack}>
            <h2 id="data-h">Four police files become one table</h2>
            <p className={p.lede}>
              Four Toronto Police major crime files, plus neighbourhood boundaries and census income, are cleaned in one pipeline. Raw files are not stored in the repository, and each is checked against a recorded fingerprint.
            </p>
            <div className={p.flowTable}>
              <DataTable
                caption="From the police files to the rows the models use"
                rowKey={(r) => r[0]}
                stack={false}
                columns={[
                  { key: 'step', header: 'Step', render: (r) => r[1] },
                  { key: 'n', header: 'Rows', num: true, render: (r) => <Num k={`${X}:${r[0]}`} /> },
                ]}
                rows={[...STEPS]}
              />
            </div>
            <p className={p.lede}>
              Robberies are <Num k={`${X}:robbery`} /> of the model rows, a share of <Num k={`${X}:robbery_share`} />.
            </p>
          </section>

          <section id="task" aria-labelledby="task-h" className={p.stack}>
            <h2 id="task-h">The task is to tell crime types apart</h2>
            <ul className={p.bullets}>
              <li>Given a reported incident, which major crime type is it: robbery, or one of the other three? This describes reported incidents, not risk.</li>
              <li>We compare robbery with auto theft, break and enter and theft over. Assault, bicycle theft, homicide and shootings are left out by rule.</li>
              <li>The explanatory model uses hour, month, weekday, after 2019 and darkness. The prediction models add the type of place (premises and location type), coordinates and neighbourhood census measures.</li>
            </ul>
            <Disclosure id="formula" title="The task in symbols">
              <p>P(robbery | reported incident): the probability that an incident is a robbery, given that it was reported.</p>
            </Disclosure>
          </section>

          <section id="models" aria-labelledby="models-h" className={p.stack}>
            <h2 id="models-h">Two kinds of model, tested on unseen data</h2>
            <ul className={p.bullets}>
              <li>
                Explanatory: a statistical model of the odds of robbery, which are robberies per other incident. Its margins of error allow for neighbourhoods behaving alike (<Num k={`${X}:log.neighbourhoods`} /> neighbourhoods).
              </li>
              <li>Prediction: five steps on identical rows, from time only to XGBoost, a machine-learning method. From the second step up, each is also fitted without the type of place.</li>
              <li>
                Scores: PR-AUC (zero to one; guessing scores the robbery share), ROC-AUC, and F1, which balances catching robberies against false alarms. Intervals come from resampling the test data.
              </li>
              <li>Two tests: new neighbourhoods (cross-validation grouped by neighbourhood) and later years (trained to 2021, tested on 2022 and 2023).</li>
            </ul>
          </section>

          <section id="explorer" aria-labelledby="explorer-h" className={p.stack}>
            <h2 id="explorer-h">Explore counts come from the data file</h2>
            <p className={p.lede}>
              The Explore page counts 2020 to 2023 records in your browser, from a data file checked against a recorded fingerprint. For robbery, bicycle theft and theft over, its counts match the course app exactly.
            </p>
          </section>

          <section id="limitations" aria-labelledby="limitations-h" className={p.stack}>
            <h2 id="limitations-h">What these results cannot say</h2>
            <Callout variant="caveat" title="Limits">
              <ul>
                <li>These are reported incidents, not risk, and they do not account for how many people or properties are present.</li>
                <li>The after-2019 figure includes every change after 2019, including how crimes were reported.</li>
                <li>The type of place partly defines the crime type, so part of its lift is built into the labels.</li>
                <li>F1 uses a tuned threshold, so it is slightly optimistic. The explanatory model&apos;s cross-validation uses random folds, so its score is not comparable with the prediction scores.</li>
                <li>Census measures describe areas, not people.</li>
              </ul>
            </Callout>
          </section>

          <Disclosure id="corrections" title="How this differs from the course projects">
            <ul className={p.bullets}>
              <li>The regression course (STA303) summary model was accidentally linear; it is now a logistic regression.</li>
              <li>The data science course (JSC370) XGBoost tuning grid was never used because of a bug; the intended grid is used now.</li>
              <li>Hour, weekday and month were plain numbers; they are now categories.</li>
            </ul>
          </Disclosure>
        </div>
      </div>
    </>
  )
}
