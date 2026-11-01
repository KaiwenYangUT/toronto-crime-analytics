import { useState } from 'react'
import { Link } from 'react-router'
import { Callout } from '../components/Callout.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { Figure } from '../components/Figure.tsx'
import { KeyPoints } from '../components/KeyPoints.tsx'
import { Legend } from '../components/Legend.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { ResultSection } from '../components/ResultSection.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { StatCard, StatGrid } from '../components/StatCard.tsx'
import { useResults } from '../lib/results.ts'
import type { ChartSvgs } from '../lib/vegaServer.ts'
import { blockImportance, CURVE_DASH, DESIGN_A, DESIGN_B, METRIC_LABEL, modelLabel, prCurves, RUNGS, rungSteps, TEST_LABEL } from '../lib/specs.ts'
import ui from '../components/ui.module.css'
import p from './predict.module.css'

export type PredictSvgs = { steps: ChartSvgs; importance: ChartSvgs; curvesA: ChartSvgs; curvesB: ChartSvgs }

const A = 'predict.ablation'
const L = (rung: string, d: string, m: string, f: string) => `${A}:designs.${d}.variants.${rung}.${m}.${f}`
/** The score of guessing for PR-AUC: the robbery share written as a decimal, so it reads beside the scores. */
const guess = (design: string) => `${A}:designs.${design}.L0.pr_auc_baseline`
const guessRoc = (design: string) => `${A}:designs.${design}.L0.roc_auc`
const est = (rung: string, d: string, m: string) => <Num k={L(rung, d, m, 'estimate')} />

/** A score with its 95% interval under it on a phone card and beside it in a table: 0.593 (0.564 to 0.618). */
function Score({ rung, design, metric }: { rung: string; design: string; metric: string }) {
  return (
    <span className={p.score}>
      <Num k={L(rung, design, metric, 'estimate')} /> (<Num k={L(rung, design, metric, 'lo')} /> to <Num k={L(rung, design, metric, 'hi')} />)
    </span>
  )
}

/** Marks as the chart draws them, in the chart's own colours (CSS variables follow the theme). */
const KEY = [
  {
    key: 'new',
    text: 'New neighbourhoods',
    glyph: (
      <>
        <line x1="2" x2="26" y1="7" y2="7" stroke="var(--accent)" strokeWidth="2.5" />
        <circle cx="14" cy="7" r="5" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2.5" />
      </>
    ),
  },
  {
    key: 'later',
    text: 'Later years',
    glyph: (
      <>
        <line x1="2" x2="26" y1="7" y2="7" stroke="var(--accent)" strokeWidth="2.5" />
        <circle cx="14" cy="7" r="5" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2.5" />
      </>
    ),
  },
  { key: 'guess', text: 'Guessing', glyph: <line x1="14" x2="14" y1="1" y2="13" stroke="var(--text-muted)" strokeWidth="2" /> },
]

/** One entry per curve in the precision-recall charts: the model's blue and its dash, then the dotted guessing line. */
const CURVE_KEY = [
  ...RUNGS.map((rung, i) => ({
    key: rung,
    text: modelLabel(rung),
    glyph: <line x1="1" x2="27" y1="7" y2="7" stroke={`var(--ordinal-${i + 1})`} strokeWidth="2.5" strokeDasharray={CURVE_DASH[rung].join(' ')} />,
  })),
  { key: 'guess', text: 'Guessing', glyph: <line x1="1" x2="27" y1="7" y2="7" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="2 4" /> },
]

type Row = { key: string; model: string; rung: string; guessing?: boolean }

/** One test's table: a guessing row, then every model with and without type of place. */
function ScoreTable({ design, caption }: { design: string; caption: string }) {
  const rows: Row[] = [
    { key: 'guess', model: 'Guessing', rung: 'L0', guessing: true },
    ...RUNGS.flatMap((rung) => [
      { key: rung, model: modelLabel(rung), rung },
      ...(rung === 'L1' ? [] : [{ key: `${rung}-np`, model: modelLabel(rung, true), rung: `${rung}-nopremises` }]),
    ]),
  ]
  return (
    <DataTable
      caption={caption}
      rowKey={(row) => row.key}
      columns={[
        { key: 'model', header: 'Model', render: (row) => row.model },
        { key: 'pr', header: 'PR-AUC', num: true, render: (row) => (row.guessing ? <Num k={guess(design)} /> : <Score rung={row.rung} design={design} metric="pr_auc" />) },
        { key: 'roc', header: 'ROC-AUC', num: true, render: (row) => (row.guessing ? <Num k={guessRoc(design)} /> : <Score rung={row.rung} design={design} metric="roc_auc" />) },
      ]}
      rows={rows}
    />
  )
}

export function Predict({ svgs }: { svgs: PredictSvgs }) {
  const data = useResults()
  const [metric, setMetric] = useState<'pr_auc' | 'roc_auc'>('pr_auc')
  const steps = rungSteps(data, metric)
  const curvesA = prCurves(data, DESIGN_A)
  const curvesB = prCurves(data, DESIGN_B)
  const imp = blockImportance(data)
  return (
    <>
      <PageHeader
        eyebrow="Predict · telling types apart"
        title="Type of place separates robbery from other major property crime far more than time."
        dek={<>Telling robbery from the other three major property crimes in reported incidents, 2014 to 2023: not risk. Type of place is the premises and location type in the record.</>}
      />

      <ResultSection
        id="steps"
        title={
          <>
            Type of place lifts the score to <Num k={L('L2', DESIGN_A, 'pr_auc', 'estimate')} />; time alone is only modestly above guessing.
          </>
        }
        figure={
          <Figure
            id="ladder"
            title={`${METRIC_LABEL[metric]} of four models, tested two ways`}
            subtitle="Dots are scores; lines are 95% intervals."
            controls={<Segmented label="Metric" value={metric} onChange={setMetric} options={[{ value: 'pr_auc', label: 'PR-AUC' }, { value: 'roc_auc', label: 'ROC-AUC' }]} />}
            legend={<Legend label="Key to the chart" items={KEY} />}
            legendFirst
            spec={steps.spec}
            svg={metric === 'pr_auc' ? svgs.steps : undefined}
            description={steps.description}
            table={steps.table}
            minHeight={400}
            caption={
              <>
                New neighbourhoods: scored on places the model never saw. Later years: trained to 2021, scored on 2022 and 2023.{' '}
                {metric === 'pr_auc' ? (
                  <>
                    Each model is described on the{' '}
                    <Link className={p.textLink} to="/#models">
                      Overview
                    </Link>
                    .
                  </>
                ) : (
                  <>On ROC-AUC guessing scores one half, and every model scores higher than on PR-AUC.</>
                )}
              </>
            }
          />
        }
      >
        <div className={p.pair}>
          <Callout variant="info" title="What is PR-AUC?">
            <p>
              A score from zero to one for finding robberies without false alarms. Guessing scores the robbery share: <Num k={guess(DESIGN_A)} /> and <Num k={guess(DESIGN_B)} /> in the two tests.
            </p>
          </Callout>
          <Callout variant="info" title="What is ROC-AUC?">
            <p>How often the model ranks a robbery above another incident. Guessing scores one half, and a perfect model scores one.</p>
          </Callout>
        </div>
        <StatGrid>
          <StatCard
            label={`Full model, ${TEST_LABEL[DESIGN_A].toLowerCase()}`}
            value={est('L5', DESIGN_A, 'pr_auc')}
            unit="PR-AUC"
            meaning={
              <>
                Far above guessing at <Num k={guess(DESIGN_A)} />. The 95% interval, <Num k={L('L5', DESIGN_A, 'pr_auc', 'lo')} /> to <Num k={L('L5', DESIGN_A, 'pr_auc', 'hi')} />, comes from resampling whole neighbourhoods. It is narrow, so the score is steady across neighbourhoods.
              </>
            }
          />
          <StatCard
            label={`Full model, ${TEST_LABEL[DESIGN_B].toLowerCase()}`}
            value={est('L5', DESIGN_B, 'pr_auc')}
            unit="PR-AUC"
            meaning={
              <>
                Lower, but guessing is lower too, at <Num k={guess(DESIGN_B)} />. Its 95% interval, <Num k={L('L5', DESIGN_B, 'pr_auc', 'lo')} /> to <Num k={L('L5', DESIGN_B, 'pr_auc', 'hi')} />, is just as tight and sits well below the first test&rsquo;s.
              </>
            }
          />
          <StatCard
            label={`Time only, ${TEST_LABEL[DESIGN_A].toLowerCase()}`}
            value={est('L1', DESIGN_A, 'pr_auc')}
            unit="PR-AUC"
            meaning={
              <>
                A little above guessing at <Num k={guess(DESIGN_A)} />: the hour, weekday and month say something about which crime it was, but not much. Its 95% interval stays above the guessing score, so the lift is small but not chance.
              </>
            }
          />
        </StatGrid>
      </ResultSection>

      <ResultSection
        id="importance"
        title="The model leans on the type of place far more than on time."
        figure={
          <Figure
            id="importance"
            title="Scrambling the type of place costs the model most"
            subtitle="Score lost when one kind of information is shuffled so the model cannot use it. Full model, new neighbourhoods."
            spec={imp.spec}
            svg={svgs.importance}
            description={imp.description}
            table={imp.table}
            minHeight={200}
          />
        }
        aside={
          <KeyPoints
            items={[
              { stat: <Num k={`${A}:designs.${DESIGN_A}.variants.L5.block_permutation_importance_pr_auc_drop.premises`} />, text: <> PR-AUC points are lost when type of place is shuffled, from <Num k={L('L5', DESIGN_A, 'pr_auc', 'estimate')} />.</> },
              { stat: <Num k={`${A}:designs.${DESIGN_A}.variants.L5.block_permutation_importance_pr_auc_drop.time`} />, text: ' points are lost when time is shuffled; census data and coordinates cost less.' },
            ]}
          />
        }
      >
        <Callout variant="caveat" title="Type of place partly defines the crime type">
          <p>
            A break and enter happens in a building, so some of the lift is built in. Without type of place, the Time and type of place model&rsquo;s ROC-AUC falls from <Num k={L('L2', DESIGN_A, 'roc_auc', 'estimate')} /> to{' '}
            <Num k={L('L2-nopremises', DESIGN_A, 'roc_auc', 'estimate')} />: read the scores as telling types apart, not forecasting robberies.
          </p>
        </Callout>
      </ResultSection>

      <section id="tables" className={ui.resultSection} aria-labelledby="tables-h">
        <h2 id="tables-h">Later-years PR-AUC is lower, but the same models come out on top.</h2>
        <div className={p.tests}>
          <div className={p.test} id="table-neighbourhoods">
            <h3>Tested on new neighbourhoods</h3>
            <p>
              The full model scores <Num k={L('L5', DESIGN_A, 'pr_auc', 'estimate')} /> on PR-AUC and <Num k={L('L5', DESIGN_A, 'roc_auc', 'estimate')} /> on ROC-AUC. Without type of place it falls to <Num k={L('L5-nopremises', DESIGN_A, 'pr_auc', 'estimate')} /> and{' '}
              <Num k={L('L5-nopremises', DESIGN_A, 'roc_auc', 'estimate')} />.
            </p>
            <ScoreTable design={DESIGN_A} caption="Scores on new neighbourhoods, with 95% intervals in brackets." />
          </div>
          <div className={p.test} id="table-years">
            <h3>Tested on later years</h3>
            <p>
              The full model scores <Num k={L('L5', DESIGN_B, 'pr_auc', 'estimate')} /> and <Num k={L('L5', DESIGN_B, 'roc_auc', 'estimate')} />. Without type of place it falls to <Num k={L('L5-nopremises', DESIGN_B, 'pr_auc', 'estimate')} /> and{' '}
              <Num k={L('L5-nopremises', DESIGN_B, 'roc_auc', 'estimate')} />.
            </p>
            <ScoreTable design={DESIGN_B} caption="Scores on later years, with 95% intervals in brackets." />
          </div>
        </div>
        <div className={`${p.pair} ${p.afterTables}`}>
          <div className={p.note}>
            <h3>How the two tests compare</h3>
            <p>
              PR-AUC is lower for nearly every model on later years, partly because robberies became a smaller share and guessing fell from <Num k={guess(DESIGN_A)} /> to <Num k={guess(DESIGN_B)} />. Compare models within a test, not across the two.
            </p>
          </div>
          <div className={p.note}>
            <h3>PR-AUC against ROC-AUC</h3>
            <KeyPoints
              items={[
                { text: <>ROC-AUC reads higher for every model: <Num k={L('L5', DESIGN_A, 'roc_auc', 'estimate')} /> against <Num k={L('L5', DESIGN_A, 'pr_auc', 'estimate')} /> for the full model.</> },
                { text: <>Robberies are a minority of incidents, so false alarms barely move ROC-AUC. PR-AUC counts them, so it is the harder score to do well on.</> },
                { text: <>Both agree: time alone adds little (<Num k={L('L1', DESIGN_A, 'pr_auc', 'estimate')} /> and <Num k={L('L1', DESIGN_A, 'roc_auc', 'estimate')} />) and type of place adds the most.</> },
              ]}
            />
          </div>
        </div>
      </section>

      <section id="curves" className={ui.resultSection} aria-labelledby="curves-h">
        <h2 id="curves-h">Models that know the type of place rise far above guessing; time alone barely does.</h2>
        <p className={p.lede}>Precision is how many flagged incidents were robberies; recall is how many robberies were caught. The dotted line is guessing, so a curve that stays above it is useful.</p>
        <Legend label="Key to the curves" items={CURVE_KEY} />
        <div className={p.curves}>
          <Figure id="pr-curves-neighbourhoods" title={TEST_LABEL[DESIGN_A]} spec={curvesA.spec} svg={svgs.curvesA} description={curvesA.description} table={curvesA.table} minHeight={340} />
          <Figure id="pr-curves-years" title={TEST_LABEL[DESIGN_B]} spec={curvesB.spec} svg={svgs.curvesB} description={curvesB.description} table={curvesB.table} minHeight={340} />
        </div>
        <p className={`${p.lede} ${p.afterCurves}`}>
          The shapes match. In later years the curves start lower and the dotted line is lower too, at <Num k={guess(DESIGN_B)} /> against <Num k={guess(DESIGN_A)} />.
        </p>
      </section>
    </>
  )
}
