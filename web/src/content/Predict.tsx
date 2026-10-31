import { useState } from 'react'
import { Callout } from '../components/Callout.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { Disclosure } from '../components/Disclosure.tsx'
import { Figure } from '../components/Figure.tsx'
import { KeyPoints } from '../components/KeyPoints.tsx'
import { Legend } from '../components/Legend.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { ResultSection } from '../components/ResultSection.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { StatCard } from '../components/StatCard.tsx'
import { useResults } from '../lib/results.ts'
import type { ChartSvgs } from '../lib/vegaServer.ts'
import { blockImportance, DESIGN_A, DESIGN_B, METRIC_LABEL, prCurves, RUNG_LABEL, RUNGS, rungSteps } from '../lib/specs.ts'
import r from './resultPages.module.css'

export type PredictSvgs = { steps: ChartSvgs; importance: ChartSvgs }

const A = 'predict.ablation'
const L = (rung: string, d: string, m: string, f: string) => `${A}:designs.${d}.variants.${rung}.${m}.${f}`

/** An estimate with its 95% interval: 0.593 (0.564 to 0.618). */
function Est({ rung, design, metric }: { rung: string; design: string; metric: string }) {
  return (
    <>
      <Num k={L(rung, design, metric, 'estimate')} /> (<Num k={L(rung, design, metric, 'lo')} /> to <Num k={L(rung, design, metric, 'hi')} />)
    </>
  )
}

function Glyphs() {
  return (
    <Legend
      label="How to read the marks"
      items={[
        { key: 'a', glyph: <circle cx="14" cy="7" r="5" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2" />, text: 'Grouped CV (filled)' },
        { key: 'b', glyph: <circle cx="14" cy="7" r="5" fill="none" stroke="var(--accent)" strokeWidth="2" />, text: 'Temporal holdout (hollow)' },
        { key: 'c', glyph: <line x1="14" y1="1" x2="14" y2="13" stroke="var(--text-muted)" strokeWidth="2" />, text: 'Guessing (grey tick)' },
      ]}
    />
  )
}

function FullModelCard({ design, label }: { design: string; label: string }) {
  return (
    <StatCard
      label={label}
      value={<Num k={L('L5', design, 'pr_auc', 'estimate')} />}
      unit="PR-AUC"
      ci={
        <>
          95% CI <Num k={L('L5', design, 'pr_auc', 'lo')} /> to <Num k={L('L5', design, 'pr_auc', 'hi')} />
        </>
      }
      meaning={
        <>
          ROC-AUC <Est rung="L5" design={design} metric="roc_auc" />. Guessing scores <Num k={`${A}:designs.${design}.prevalence`} />.
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
    { key: DESIGN_A, label: 'Grouped CV' },
    { key: DESIGN_B, label: 'Temporal holdout' },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Predict · classification"
        title="The premises, not the time, separate robbery from other property crime."
        dek={
          <>
            Models for <Num k={`${A}:designs.${DESIGN_A}.rows`} /> reported incidents, each scored two ways with a 95% interval.
          </>
        }
      />

      <ResultSection
        id="steps"
        title={
          <>
            In grouped cross-validation, premises and location type lift <span className={r.nowrap}>PR-AUC</span> from <Num k={L('L1', DESIGN_A, 'pr_auc', 'estimate')} /> to <Num k={L('L2', DESIGN_A, 'pr_auc', 'estimate')} />; time alone barely beats guessing.
          </>
        }
        figure={
          <Figure
            id="ladder"
            title={`${METRIC_LABEL[metric]} of four models, two ways of testing`}
            controls={<Segmented label="Metric" value={metric} onChange={setMetric} options={[{ value: 'pr_auc', label: 'PR-AUC' }, { value: 'roc_auc', label: 'ROC-AUC' }]} />}
            legend={<Glyphs />}
            spec={steps.spec}
            svg={metric === 'pr_auc' ? svgs.steps : undefined}
            description={steps.description}
            table={steps.table}
            minHeight={396}
            caption={
              metric === 'pr_auc' ? (
                <>
                  Dot: test score; line: 95% interval; the full model is XGBoost. PR-AUC is a score from zero to one where guessing scores the robbery share (<Num k={`${A}:designs.${DESIGN_A}.prevalence`} /> in grouped CV, <Num k={`${A}:designs.${DESIGN_B}.prevalence`} /> in the holdout).
                </>
              ) : (
                <>
                  Dot: test score; line: 95% interval; the full model is XGBoost. ROC-AUC is how often a robbery is ranked above another incident; guessing scores <Num k={`${A}:designs.${DESIGN_A}.L0.roc_auc`} />.
                </>
              )
            }
          />
        }
        aside={
          <>
            <FullModelCard design={DESIGN_A} label="Full model, grouped by neighbourhood" />
            <FullModelCard design={DESIGN_B} label="Full model, tested on 2022 and 2023" />
          </>
        }
      >
        <DataTable
          caption="Two ways to test the model. Baseline is the robbery share and Full is the full model; the holdout is harder, so compare within a row."
          rowKey={(row) => row.key}
          columns={[
            { key: 'design', header: 'Design', render: (row) => row.label },
            { key: 'base', header: 'Baseline', num: true, render: (row) => <Num k={`${A}:designs.${row.key}.prevalence`} /> },
            { key: 'l1', header: 'Time only, PR-AUC', num: true, render: (row) => <Est rung="L1" design={row.key} metric="pr_auc" /> },
            { key: 'l5', header: 'Full PR-AUC', num: true, render: (row) => <Est rung="L5" design={row.key} metric="pr_auc" /> },
            { key: 'roc', header: 'Full ROC-AUC', num: true, render: (row) => <Est rung="L5" design={row.key} metric="roc_auc" /> },
            { key: 'f1', header: 'Full F1, tuned', num: true, render: (row) => <Est rung="L5" design={row.key} metric="f1" /> },
          ]}
          rows={designs}
        />
      </ResultSection>

      <ResultSection
        id="importance"
        title="Premises and location type are the information the model leans on."
        figure={
          <Figure
            id="importance"
            title="Shuffling premises and location type costs the most"
            subtitle="Drop in PR-AUC when one block of features is shuffled, grouped CV, full model."
            spec={imp.spec}
            svg={svgs.importance}
            description={imp.description}
            table={imp.table}
            minHeight={200}
          />
        }
        aside={
          <>
            <KeyPoints
              items={[
                { stat: <Num k={`${A}:designs.${DESIGN_A}.variants.L5.block_permutation_importance_pr_auc_drop.premises`} />, text: ' of PR-AUC lost when premises and location type are shuffled.' },
                { stat: <Num k={`${A}:designs.${DESIGN_A}.variants.L5.block_permutation_importance_pr_auc_drop.time`} />, text: ' lost when time is shuffled; census and geography cost less.' },
              ]}
            />
          </>
        }
      >
        <Callout variant="caveat" title="Premises partly define the crime type">
          <p>
            A break and enter happens in a building, and robberies are mostly recorded outdoors or in shops, so part of the lift is built into the labels. Without premises and location type, the second model&rsquo;s ROC-AUC falls from{' '}
            <Num k={L('L2', DESIGN_A, 'roc_auc', 'estimate')} /> to <Num k={L('L2-nopremises', DESIGN_A, 'roc_auc', 'estimate')} />: read these scores as a map of what separates the classes, not a forecast of robbery.
          </p>
        </Callout>
        <Disclosure id="all-models" title="All models and both designs">
          <DataTable
            caption="Scores with 95% intervals"
            rowKey={(row) => row.key}
            columns={[
              { key: 'design', header: 'Design', render: (row) => row.design },
              { key: 'model', header: 'Model', render: (row) => row.model },
              { key: 'pr', header: 'PR-AUC', num: true, render: (row) => <Est rung={row.rung} design={row.dk} metric="pr_auc" /> },
              { key: 'roc', header: 'ROC-AUC', num: true, render: (row) => <Est rung={row.rung} design={row.dk} metric="roc_auc" /> },
              { key: 'f1', header: 'F1', num: true, render: (row) => <Est rung={row.rung} design={row.dk} metric="f1" /> },
            ]}
            rows={designs.flatMap(({ key: dk, label }) =>
              RUNGS.flatMap((rung) => [
                { key: `${dk}-${rung}`, design: label, dk, rung, model: `${rung} ${RUNG_LABEL[rung]}` },
                ...(rung === 'L1' ? [] : [{ key: `${dk}-${rung}-np`, design: label, dk, rung: `${rung}-nopremises`, model: `${rung} ${RUNG_LABEL[rung]}, no premises` }]),
              ]),
            )}
          />
        </Disclosure>
        <Disclosure id="pr-curves" title="Precision–recall curves">
          <div className={r.half}>
            <Segmented
              label="Evaluation design"
              value={design}
              onChange={setDesign}
              options={[{ value: 'A', label: 'Grouped CV' }, { value: 'B', label: 'Temporal holdout' }]}
            />
            <Figure
              id="pr-curves"
              title="Each curve rises well above the baseline only when premises and location type are in the model"
              subtitle="Precision against recall for each model; the dotted line is the share of robberies."
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
