import { useState } from 'react'
import { Callout } from '../components/Callout.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { Disclosure } from '../components/Disclosure.tsx'
import { Figure } from '../components/Figure.tsx'
import { KeyPoints } from '../components/KeyPoints.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { ResultSection } from '../components/ResultSection.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { StatCard } from '../components/StatCard.tsx'
import { useResults } from '../lib/results.ts'
import type { ChartSvgs } from '../lib/vegaServer.ts'
import { blockImportance, DESIGN_A, DESIGN_B, METRIC_LABEL, modelLabel, prCurves, RUNGS, rungSteps, TEST_LABEL } from '../lib/specs.ts'
import r from './resultPages.module.css'

export type PredictSvgs = { steps: ChartSvgs; importance: ChartSvgs }

const A = 'predict.ablation'
const L = (rung: string, d: string, m: string, f: string) => `${A}:designs.${d}.variants.${rung}.${m}.${f}`
/** The score of guessing for PR-AUC: the robbery share written as a decimal, so it reads beside the scores. */
const guess = (design: string) => `${A}:designs.${design}.L0.pr_auc_baseline`

/** An estimate with its 95% interval: 0.593 (0.564 to 0.618). */
function Est({ rung, design, metric }: { rung: string; design: string; metric: string }) {
  return (
    <>
      <Num k={L(rung, design, metric, 'estimate')} /> (<Num k={L(rung, design, metric, 'lo')} /> to <Num k={L(rung, design, metric, 'hi')} />)
    </>
  )
}

function FullModelCard({ design, label }: { design: string; label: string }) {
  return (
    <StatCard
      label={label}
      value={<Num k={L('L5', design, 'pr_auc', 'estimate')} />}
      unit="score (PR-AUC)"
      ci={
        <>
          95% interval <Num k={L('L5', design, 'pr_auc', 'lo')} /> to <Num k={L('L5', design, 'pr_auc', 'hi')} />
        </>
      }
      meaning={
        <>
          Guessing scores <Num k={guess(design)} />.
        </>
      }
    />
  )
}

export function Predict({ svgs }: { svgs: PredictSvgs }) {
  const data = useResults()
  const [metric, setMetric] = useState<'pr_auc' | 'roc_auc'>('pr_auc')
  const [design, setDesign] = useState<'A' | 'B'>('A')
  const steps = rungSteps(data, metric)
  const pr = prCurves(data, design === 'A' ? DESIGN_A : DESIGN_B)
  const imp = blockImportance(data)
  const designs = [
    { key: DESIGN_A, label: TEST_LABEL[DESIGN_A] },
    { key: DESIGN_B, label: TEST_LABEL[DESIGN_B] },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Predict · telling types apart"
        title="Type of place separates robbery from other major property crime far more than time."
        dek={
          <>
            Type of place is the premises and location type in the record.
          </>
        }
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
            subtitle="Bars show 95% intervals."
            controls={<Segmented label="Metric" value={metric} onChange={setMetric} options={[{ value: 'pr_auc', label: 'PR-AUC' }, { value: 'roc_auc', label: 'ROC-AUC' }]} />}
            spec={steps.spec}
            svg={metric === 'pr_auc' ? svgs.steps : undefined}
            description={steps.description}
            table={steps.table}
            minHeight={310}
            caption={
              metric === 'pr_auc' ? (
                <>
                  PR-AUC runs from zero to one; guessing scores the robbery share, <Num k={guess(DESIGN_A)} /> and <Num k={guess(DESIGN_B)} />. Time alone scores <Num k={L('L1', DESIGN_A, 'pr_auc', 'estimate')} />. The full model is XGBoost, a standard machine-learning method, built from <Num k={`${A}:designs.${DESIGN_A}.rows`} /> reported incidents.
                </>
              ) : (
                <>
                  ROC-AUC is how often a robbery is ranked above another incident; guessing scores <Num k={`${A}:designs.${DESIGN_A}.L0.roc_auc`} />. The full model is XGBoost, a standard machine-learning method.
                </>
              )
            }
          />
        }
        aside={
          <>
            <FullModelCard design={DESIGN_A} label="Full model, new neighbourhoods" />
            <FullModelCard design={DESIGN_B} label="Full model, later years" />
          </>
        }
      />

      <ResultSection
        id="importance"
        title="The model leans on the type of place far more than on time."
        figure={
          <Figure
            id="importance"
            title="Scrambling the type of place costs the model most"
            subtitle="Score lost when one kind of information is scrambled; full model, new neighbourhoods."
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
              { stat: <Num k={`${A}:designs.${DESIGN_A}.variants.L5.block_permutation_importance_pr_auc_drop.premises`} />, text: ' of the score is lost when type of place is scrambled.' },
              { stat: <Num k={`${A}:designs.${DESIGN_A}.variants.L5.block_permutation_importance_pr_auc_drop.time`} />, text: ' when time is; census data and coordinates cost less.' },
            ]}
          />
        }
      >
        <Callout variant="caveat" title="Type of place partly defines the crime type">
          <p>
            A break and enter happens in a building, so some of the lift is built in. Without type of place, the time-and-place model&rsquo;s ROC-AUC, a second score where guessing is one half, falls from{' '}
            <Num k={L('L2', DESIGN_A, 'roc_auc', 'estimate')} /> to <Num k={L('L2-nopremises', DESIGN_A, 'roc_auc', 'estimate')} />. Read these scores as what separates crime types, not a forecast of robberies.
          </p>
        </Callout>
        <Disclosure id="all-models" title="All models and both tests">
          <DataTable
            caption="Scores with 95% intervals. F1 balances catching robberies against false alarms; its tuned threshold makes it slightly optimistic. New neighbourhoods is grouped cross-validation; later years is a holdout trained to 2021 and tested on 2022 and 2023."
            rowKey={(row) => row.key}
            columns={[
              { key: 'design', header: 'Test', render: (row) => row.design },
              { key: 'model', header: 'Model', render: (row) => row.model },
              { key: 'pr', header: 'PR-AUC', num: true, render: (row) => <Est rung={row.rung} design={row.dk} metric="pr_auc" /> },
              { key: 'roc', header: 'ROC-AUC', num: true, render: (row) => <Est rung={row.rung} design={row.dk} metric="roc_auc" /> },
              { key: 'f1', header: 'F1', num: true, render: (row) => <Est rung={row.rung} design={row.dk} metric="f1" /> },
            ]}
            rows={designs.flatMap(({ key: dk, label }) =>
              RUNGS.flatMap((rung) => [
                { key: `${dk}-${rung}`, design: label, dk, rung, model: modelLabel(rung) },
                ...(rung === 'L1' ? [] : [{ key: `${dk}-${rung}-np`, design: label, dk, rung: `${rung}-nopremises`, model: modelLabel(rung, true) }]),
              ]),
            )}
          />
        </Disclosure>
        <Disclosure id="pr-curves" title="Catching robberies against false alarms">
          <div className={r.half}>
            <Segmented
              label="Test"
              value={design}
              onChange={setDesign}
              options={[{ value: 'A', label: TEST_LABEL[DESIGN_A] }, { value: 'B', label: TEST_LABEL[DESIGN_B] }]}
            />
            <Figure
              id="pr-curves"
              title="Only models that know the type of place rise well above guessing"
              subtitle="Precision: how many flagged incidents were robberies. Recall: how many robberies were caught. Dotted line: guessing."
              spec={pr.spec}
              description={pr.description}
              table={pr.table}
              minHeight={360}
            />
          </div>
        </Disclosure>
      </ResultSection>
    </>
  )
}
