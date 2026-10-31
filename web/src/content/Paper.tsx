import { KeyPoints } from '../components/KeyPoints.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { DESIGN_A } from '../lib/specs.ts'
import ui from '../components/ui.module.css'
import p from './pages.module.css'

const A = 'predict.ablation'
const I = 'predict.inference_vs_prediction'
const v = (rung: string, m: string, f: string) => `${A}:designs.${DESIGN_A}.variants.${rung}.${m}.${f}`

const INSIDE = [
  ['Question', 'Which crime type is a reported incident?'],
  ['Data', 'Toronto Police major crime files.'],
  ['Models', 'A logistic regression and a five-step prediction ladder.'],
  ['Findings', 'Timing effects are clear, but weak predictors of crime type.'],
]

export function Paper() {
  const pdf = `${import.meta.env.BASE_URL}paper/paper.pdf`
  return (
    <>
      <PageHeader eyebrow="Paper" title="Many time effects are statistically clear, yet time alone predicts little." />
      <div className={p.paperGrid}>
        <div className={p.paperMain}>
          <section aria-labelledby="brief-h">
            <h2 id="brief-h" className={p.subhead}>In brief</h2>
            <KeyPoints
              items={[
                {
                  stat: (
                    <>
                      <Num k={`${I}:time_terms_clear`} /> of <Num k={`${I}:time_terms`} />
                    </>
                  ),
                  text: 'time effects are statistically clear, with 95% intervals that exclude no effect.',
                },
                {
                  stat: <Num k={v('L1', 'pr_auc', 'estimate')} />,
                  text: (
                    <>
                      PR-AUC from time alone, where guessing scores <Num k={`${A}:designs.${DESIGN_A}.prevalence`} />.
                    </>
                  ),
                },
                {
                  stat: <Num k={v('L5', 'pr_auc', 'estimate')} />,
                  text: (
                    <>
                      PR-AUC for the full model, but only <Num k={v('L5-nopremises', 'pr_auc', 'estimate')} /> without premises and location type.
                    </>
                  ),
                },
              ]}
            />
          </section>
          <section aria-labelledby="inside-h">
            <h2 id="inside-h" className={p.subhead}>Inside the paper</h2>
            <dl className={p.inside}>
              {INSIDE.map(([k, text]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{k}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </section>
          <p className={p.fine}>Reported incidents, not risk.</p>
        </div>

        <div className={p.paperSide}>
          <article className={p.docCard} aria-labelledby="doc-title">
            <p className={p.docKind}>PDF</p>
            <h2 id="doc-title" className={p.docTitle}>Which crime type is it?</h2>
            <p className={p.docMeta}>Kaiwen Yang</p>
            <div className={p.docActions}>
              <a className={`${ui.btn} ${ui.btnPrimary}`} href={pdf} download>Download PDF</a>
              <a className={ui.btn} href={pdf} target="_blank" rel="noopener noreferrer">Open in browser</a>
            </div>
          </article>
          <iframe className={p.preview} src={pdf} loading="lazy" title="Preview of the paper (PDF)" />
        </div>
      </div>
    </>
  )
}
