import { Link } from 'react-router'
import { Callout } from '../components/Callout.tsx'
import { Num } from '../components/Num.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { Section } from '../components/Section.tsx'
import { DESIGN_A } from '../lib/specs.ts'
import ui from '../components/ui.module.css'

const X = 'explain.sta303_v2'
const A = 'predict.ablation'
const I = 'predict.inference_vs_prediction'
const v = (rung: string, m: string, f: string) => `${A}:designs.${DESIGN_A}.variants.${rung}.${m}.${f}`

export function Paper() {
  const pdf = `${import.meta.env.BASE_URL}paper/paper.pdf`
  return (
    <>
      <PageHeader
        eyebrow="Paper"
        title="Many time effects are statistically clear, yet time alone predicts little."
        dek="A short research paper that answers one question twice: given a reported property-type crime, which type is it?"
        sources={[X, A, I]}
      />
      <div className="prose">
        <p>
          <a className={`${ui.btn} ${ui.btnPrimary}`} href={pdf}>Download the paper (PDF)</a>
        </p>
        <Section id="abstract" title="In brief">
          <div className="prose">
          <p>
            An explanatory model and a prediction ladder use the same <Num k={`${X}:n`} /> reported incidents from 2014 to 2023. The regression finds that the odds of a robbery were{' '}
            <Num k={`${X}:post2019.or`} /> times as high after 2019 (cluster-robust 95% interval <Num k={`${X}:post2019.robust_or_lo`} /> to <Num k={`${X}:post2019.robust_or_hi`} />), and that{' '}
            <Num k={`${I}:time_terms_clear`} /> of <Num k={`${I}:time_terms`} /> time terms have intervals that exclude one.
          </p>
          <p>
            In the ladder, time alone reaches a PR-AUC of <Num k={v('L1', 'pr_auc', 'estimate')} /> where the baseline is <Num k={`${A}:designs.${DESIGN_A}.prevalence`} />. The full model reaches{' '}
            <Num k={v('L5', 'pr_auc', 'estimate')} />, and without premises and location type only <Num k={v('L5-nopremises', 'pr_auc', 'estimate')} />. The estimates describe the mix of reported crime types, not
            the risk of being robbed.
          </p>
          </div>
        </Section>
        <Section id="contents" title="What the paper covers">
          <div className="prose">
          <ul>
            <li>The task definition, the data and how the mix of crime types shifted over the decade.</li>
            <li>The corrected odds-of-robbery model with cluster-robust intervals, and the five-rung prediction ladder.</li>
            <li>Two evaluation designs: held-out neighbourhoods and a held-out later period, with bootstrap intervals for every score and difference.</li>
            <li>A side-by-side reading of inference and prediction, and the limitations of both.</li>
          </ul>
          <p>
            Precision–recall curves, calibration and the original six-model benchmark do not fit the page budget; they are on <Link to="/predict">Predict</Link>. The{' '}
            <Link to="/explore">Explorer</Link> is a site feature and is not part of the paper.
          </p>
          </div>
        </Section>
        <Section id="reproduce" title="Where the numbers come from">
          <Callout variant="info" title="Every number is generated">
            <p>
              The paper's numbers and tables are generated from the same result files as this site, and its figures are drawn from the same chart specifications. See{' '}
              <Link to="/methods#reproducibility">Reproducibility</Link>.
            </p>
          </Callout>
        </Section>
      </div>
    </>
  )
}
