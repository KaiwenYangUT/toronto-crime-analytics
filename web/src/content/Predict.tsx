import { useState } from 'react'
import { Callout } from '../components/Callout.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { Figure } from '../components/Figure.tsx'
import { Legend } from '../components/Legend.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { Section } from '../components/Section.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { useResults } from '../lib/results.ts'
import type { ChartSvgs } from '../lib/vegaServer.ts'
import { ablationLadder, blockImportance, DESIGN_A, DESIGN_B, prCurves, RUNG_LABEL, RUNGS, type Metric } from '../lib/specs.ts'
import ui from '../components/ui.module.css'

export type PredictSvgs = { ladder: ChartSvgs; prA: ChartSvgs; prB: ChartSvgs; importance: ChartSvgs }

const A = 'predict.ablation'
const V = 'predict.inference_vs_prediction'
const J = 'predict.jsc370_benchmark'
const MODEL_KEYS = ['glm', 'tree', 'bagging', 'rf', 'gbm', 'xgb'] as const
const MODEL_LABEL: Record<string, string> = { glm: 'Logistic regression', tree: 'Decision tree', bagging: 'Bagging', rf: 'Random forest', gbm: 'Gradient boosting (gbm)', xgb: 'XGBoost' }

const ADDED = [
  ['premises_and_location_and_geography_L2_minus_L1', 'Add premises, location type and geography to time'],
  ['premises_and_location_alone_L2_minus_L2_nopremises', 'Premises and location type alone (L2 against L2 without them)'],
  ['census_L3_minus_L2', 'Add census measures'],
  ['forest_L4_minus_L3', 'Switch to a random forest'],
  ['xgboost_L5_minus_L4', 'Switch to XGBoost'],
] as const

function Glyphs() {
  return (
    <Legend
      label="How to read the marks"
      items={[
        { key: 'a', glyph: <circle cx="14" cy="7" r="5" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2" />, text: 'Grouped cross-validation by neighbourhood (filled)' },
        { key: 'b', glyph: <circle cx="14" cy="7" r="5" fill="none" stroke="var(--accent)" strokeWidth="2" />, text: 'Temporal holdout, 2022 to 2023 (hollow)' },
        { key: 'c', glyph: <line x1="2" y1="7" x2="26" y2="7" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" opacity="0.6" />, text: 'Without premises and location type (dashed, lighter)' },
        { key: 'd', glyph: <line x1="2" y1="7" x2="26" y2="7" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="2 4" />, text: 'Baseline' },
      ]}
    />
  )
}

export function Predict({ svgs }: { svgs: PredictSvgs }) {
  const data = useResults()
  const [metric, setMetric] = useState<Metric>('pr_auc')
  const [design, setDesign] = useState<'A' | 'B'>('A')
  const ladder = ablationLadder(data, metric)
  const pr = prCurves(data, design === 'A' ? DESIGN_A : DESIGN_B)
  const imp = blockImportance(data)
  const L = (rung: string, d: string, m: string, f: string) => `${A}:designs.${d}.variants.${rung}.${m}.${f}`
  return (
    <>
      <PageHeader
        eyebrow="Predict · classification"
        title="Place separates robbery from other property crime; time and census context add little."
        dek={
          <>
            Five models on the same <Num k={`${A}:designs.${DESIGN_A}.rows`} /> reported incidents, each scored with a 95% interval.
          </>
        }
        sources={[A, V, J]}
      />

      <div className={ui.stack}>
        <Segmented
          label="Metric"
          value={metric}
          onChange={setMetric}
          options={[{ value: 'pr_auc', label: 'PR-AUC' }, { value: 'roc_auc', label: 'ROC-AUC' }, { value: 'f1', label: 'F1' }]}
        />
        <Glyphs />
        <Figure
          id="ladder"
          title="Time alone barely beats the baseline; premises and location type do the work"
          subtitle="Test-fold score of each model rung with 95% intervals, under two evaluation designs."
          spec={ladder.spec}
          svg={metric === 'pr_auc' ? svgs.ladder : undefined}
          description={ladder.description}
          table={ladder.table}
          minHeight={380}
          caption={
            <>
              Rungs: {RUNGS.map((r) => `${r} ${RUNG_LABEL[r]}`).join('; ')}. The F1 score uses the threshold that maximises F1 on the inner
              out-of-fold predictions. Grouped cross-validation holds out whole neighbourhoods (<Num k={`${A}:designs.${DESIGN_A}.clusters`} />); the temporal holdout trains on
              years up to 2021 and tests on 2022 and 2023.
            </>
          }
          source={<>Source: <code>{A}</code> · <Num k={`${A}:designs.${DESIGN_A}.bootstrap_replicates`} /> bootstrap replicates.</>}
        />
        <Callout variant="caveat" title="Premises and location type partly define the crime type">
          <p>
            A break and enter happens in a dwelling or business and a robbery usually in the open, so part of the lift from place is built into the labels. Without premises and
            location type, the second rung falls from a ROC-AUC of <Num k={L('L2', DESIGN_A, 'roc_auc', 'estimate')} /> to{' '}
            <Num k={L('L2-nopremises', DESIGN_A, 'roc_auc', 'estimate')} />. Treat the ladder as a map of what information separates the classes, not as a tool to forecast robbery.
          </p>
        </Callout>
      </div>

      <Section id="adds" title="What each step adds (grouped cross-validation)">
        <DataTable
          caption="Paired differences in PR-AUC and ROC-AUC with 95% intervals from the same bootstrap draws"
          rowKey={(r) => r[0]}
          columns={[
            { key: 'step', header: 'Step', render: (r) => r[1] },
            { key: 'pr', header: 'Change in PR-AUC (95% interval)', num: true, render: (r) => <><Num k={`${V}:designs.${DESIGN_A}.added_by_block.${r[0]}.pr_auc.estimate`} /> (<Num k={`${V}:designs.${DESIGN_A}.added_by_block.${r[0]}.pr_auc.lo`} /> to <Num k={`${V}:designs.${DESIGN_A}.added_by_block.${r[0]}.pr_auc.hi`} />)</> },
            { key: 'roc', header: 'Change in ROC-AUC (95% interval)', num: true, render: (r) => <><Num k={`${V}:designs.${DESIGN_A}.added_by_block.${r[0]}.roc_auc.estimate`} /> (<Num k={`${V}:designs.${DESIGN_A}.added_by_block.${r[0]}.roc_auc.lo`} /> to <Num k={`${V}:designs.${DESIGN_A}.added_by_block.${r[0]}.roc_auc.hi`} />)</> },
          ]}
          rows={[...ADDED]}
        />
      </Section>

      <Section id="models" title="All models, both evaluation designs">
        <DataTable
          caption="Scores with 95% intervals; the baseline row is the share of robberies"
          rowKey={(r) => r.key}
          columns={[
            { key: 'design', header: 'Design', render: (r) => r.design },
            { key: 'model', header: 'Model', render: (r) => r.model },
            { key: 'pr', header: 'PR-AUC', num: true, render: (r) => <><Num k={L(r.rung, r.dk, 'pr_auc', 'estimate')} /> (<Num k={L(r.rung, r.dk, 'pr_auc', 'lo')} /> to <Num k={L(r.rung, r.dk, 'pr_auc', 'hi')} />)</> },
            { key: 'roc', header: 'ROC-AUC', num: true, render: (r) => <><Num k={L(r.rung, r.dk, 'roc_auc', 'estimate')} /> (<Num k={L(r.rung, r.dk, 'roc_auc', 'lo')} /> to <Num k={L(r.rung, r.dk, 'roc_auc', 'hi')} />)</> },
            { key: 'f1', header: 'F1', num: true, render: (r) => <><Num k={L(r.rung, r.dk, 'f1', 'estimate')} /> (<Num k={L(r.rung, r.dk, 'f1', 'lo')} /> to <Num k={L(r.rung, r.dk, 'f1', 'hi')} />)</> },
          ]}
          rows={[
            ...[[DESIGN_A, 'Grouped CV'], [DESIGN_B, 'Temporal holdout']].flatMap(([dk, design]) =>
              RUNGS.flatMap((r) => [
                { key: `${dk}-${r}`, design, dk, rung: r, model: `${r} ${RUNG_LABEL[r]}` },
                ...(r === 'L1' ? [] : [{ key: `${dk}-${r}-np`, design, dk, rung: `${r}-nopremises`, model: `${r} ${RUNG_LABEL[r]}, no premises` }]),
              ]),
            ),
          ]}
        />
        <p className="prose" style={{ marginTop: 'var(--space-3)' }}>
          Baselines: PR-AUC equals the share of robberies, <Num k={`${A}:designs.${DESIGN_A}.prevalence`} /> under grouped cross-validation and{' '}
          <Num k={`${A}:designs.${DESIGN_B}.prevalence`} /> in the 2022 to 2023 holdout; ROC-AUC of a constant score is <Num k={`${A}:designs.${DESIGN_A}.L0.roc_auc`} />.
        </p>
      </Section>

      <Section id="curves" title="Precision and recall">
        <div className={ui.stack}>
          <Segmented
            label="Evaluation design"
            value={design}
            onChange={setDesign}
            options={[{ value: 'A', label: 'Grouped CV' }, { value: 'B', label: 'Temporal holdout' }]}
          />
          <Figure
            id="pr-curves"
            title="Each rung's curve rises above the baseline only when place is in the model"
            subtitle="Precision against recall for each rung; the dotted line is the share of robberies."
            spec={pr.spec}
            svg={design === 'A' ? svgs.prA : svgs.prB}
            description={pr.description}
            table={pr.table}
            minHeight={360}
            caption="Rungs use a single-hue ramp from light (time only) to dark (XGBoost). The data table lists every tenth point."
          />
        </div>
      </Section>

      <Section id="importance" title="Which information the best model uses">
        <Figure
          id="importance"
          title="Shuffling premises and location type costs the most"
          subtitle="Drop in PR-AUC when one block of features is permuted, grouped by neighbourhood (XGBoost rung)."
          spec={imp.spec}
          svg={svgs.importance}
          description={imp.description}
          table={imp.table}
          minHeight={200}
        />
      </Section>

      <Section id="temporal" title="The temporal holdout and a shift in the base rate">
        <div className="prose">
          <p>
            Training up to 2021 and testing on 2022 and 2023 is the harder, more realistic split. The share of robberies in the incidents fell from{' '}
            <Num k={`${A}:designs.${DESIGN_A}.prevalence_by_year.2014`} /> in 2014 to <Num k={`${A}:designs.${DESIGN_A}.prevalence_by_year.2023`} /> in 2023, so a threshold tuned on earlier
            years meets a different mix. PR-AUC is not comparable across the two designs for that reason: the baselines differ.
          </p>
        </div>
      </Section>

      <Section id="benchmark" title="The original JSC370 benchmark, re-run and ported">
        <div className={ui.stack}>
          <p className="prose">
            The original report compared six models on <Num k="predict.eda_corrections:rows" /> robbery and other incidents from <Num k="predict.eda_corrections:year" />. The R re-run equals the published table at seven
            decimals. The Python port stays within tolerance, with the same tier ranking: bagging and the random forest first, XGBoost second, the tree third, the logistic and gradient-boosting models last.
          </p>
          <DataTable
            caption="Test accuracy and F1 on the original split, R re-run and Python port"
            rowKey={(r) => r}
            columns={[
              { key: 'model', header: 'Model', render: (r) => MODEL_LABEL[r] },
              { key: 'ar', header: 'Accuracy, R', num: true, render: (r) => <Num k={`${J}:models.${r}.r.test_accuracy`} /> },
              { key: 'ap', header: 'Accuracy, Python', num: true, render: (r) => <Num k={`${J}:models.${r}.python.test_accuracy`} /> },
              { key: 'fr', header: 'F1, R', num: true, render: (r) => <Num k={`${J}:models.${r}.r.f1`} /> },
              { key: 'fp', header: 'F1, Python', num: true, render: (r) => <Num k={`${J}:models.${r}.python.f1`} /> },
            ]}
            rows={[...MODEL_KEYS]}
          />
          <Callout variant="caveat" title="A bug in the original XGBoost tuning">
            <p>
              The original defined a tuning grid of <Num k="predict.xgb_grid_fix:as_intended.grid_size" /> rows but never passed it to the trainer, which used caret's default grid. With the intended grid the mean test F1 over ten seeds is{' '}
              <Num k="predict.xgb_grid_fix:as_intended.test.f1_mean" />, against <Num k="predict.xgb_grid_fix:as_run_caret_default.test.f1_mean" /> as run.
            </p>
          </Callout>
        </div>
      </Section>
    </>
  )
}
