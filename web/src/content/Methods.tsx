import { Callout } from '../components/Callout.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import p from './pages.module.css'

const X = 'explain.sta303_v2'
const TOC = [
  ['data', 'Data and sample flow'],
  ['task', 'Task and variables'],
  ['models', 'Models and evaluation'],
  ['explorer', 'Explore counts'],
  ['limitations', 'Limitations'],
]
const STEPS = [
  ['log.source_rows', 'Rows in the four police files'],
  ['log.rows_outside_2014_2023_or_invalid_date', 'Removed: outside 2014 to 2023, or invalid date'],
  ['log.rows_outside_toronto_box', 'Removed: coordinates outside Toronto'],
  ['log.exact_duplicate_rows_dropped', 'Removed: exact duplicates'],
  ['log.cross_category_conflict_rows_dropped', 'Removed: events labelled both robbery and another type'],
  ['log.ledger_final_rows', 'Rows in the unified table'],
  ['log.nsa_rows_dropped', 'Removed: no neighbourhood'],
  ['log.model_rows', 'Rows used by the models'],
] as const

export function Methods() {
  return (
    <>
      <PageHeader eyebrow="Methods" title="One cleaned dataset of reported incidents feeds every result on this site." />
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
            <h2 id="data-h">Data and sample flow</h2>
            <p className={p.lede}>
              Four Toronto Police major crime files, with neighbourhood boundaries and census income, are cleaned in one pipeline. Files are checked against recorded checksums and never committed.
            </p>
            <DataTable
              caption="From source files to model rows"
              rowKey={(r) => r[0]}
              columns={[
                { key: 'step', header: 'Step', render: (r) => r[1] },
                { key: 'n', header: 'Count', num: true, render: (r) => <Num k={`${X}:${r[0]}`} /> },
              ]}
              rows={[...STEPS]}
            />
            <p className={p.lede}>
              Robberies are <Num k={`${X}:robbery`} /> of the model rows, a share of <Num k={`${X}:robbery_share`} />.
            </p>
          </section>

          <section id="task" aria-labelledby="task-h" className={p.stack}>
            <h2 id="task-h">Task and variables</h2>
            <ul className={p.bullets}>
              <li>The task is P(robbery | reported incident): which major crime type a reported incident is. It describes reported incidents, not risk.</li>
              <li>Robbery is the positive class; auto theft, break and enter and theft over are the negative class. Assault, bicycle theft, homicide and shootings are excluded by rule.</li>
              <li>The explanatory model uses hour, month, weekday, a post-2019 indicator and solar darkness. The prediction models add premises and location type, latitude and longitude, and neighbourhood census measures.</li>
            </ul>
          </section>

          <section id="models" aria-labelledby="models-h" className={p.stack}>
            <h2 id="models-h">Models and evaluation</h2>
            <ul className={p.bullets}>
              <li>
                Explanatory model: a logistic regression of robbery against the other three types, with standard errors clustered by neighbourhood (<Num k={`${X}:log.neighbourhoods`} /> clusters).
              </li>
              <li>Prediction models: five steps on identical rows, from time only to XGBoost, each also fitted without premises and location type.</li>
              <li>
                Scores are PR-AUC (guessing scores the robbery share), ROC-AUC and F1, with bootstrap 95% intervals. They are tested on held-out neighbourhoods and on a held-out period, 2022 and 2023.
              </li>
            </ul>
            <h3 className={p.sub}>Corrections to the course models</h3>
            <ul className={p.bullets}>
              <li>The STA303 summary model was accidentally linear; it is now a logistic regression.</li>
              <li>The JSC370 XGBoost tuning grid was never used because of a bug; the intended grid is used now.</li>
              <li>Hour, weekday and month were plain numbers; they are now categories.</li>
            </ul>
          </section>

          <section id="explorer" aria-labelledby="explorer-h" className={p.stack}>
            <h2 id="explorer-h">Explore counts</h2>
            <p className={p.lede}>
              The Explore page counts 2020 to 2023 records in your browser from a checksummed data bundle, not from a results file. For the three course categories its counts match the original Shiny app exactly.
            </p>
          </section>

          <section id="limitations" aria-labelledby="limitations-h" className={p.stack}>
            <h2 id="limitations-h">Limitations</h2>
            <Callout variant="caveat" title="What these results cannot say">
              <ul>
                <li>These are reported incidents, not risk, and are not adjusted for exposure.</li>
                <li>The post-2019 term absorbs every change after 2019, including reporting practice.</li>
                <li>Premises and location type partly define the crime type, so part of their lift is built into the labels.</li>
                <li>Census measures describe areas, not people.</li>
              </ul>
            </Callout>
          </section>
        </div>
      </div>
    </>
  )
}
