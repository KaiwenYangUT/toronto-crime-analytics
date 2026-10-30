import { Callout } from '../components/Callout.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { Section } from '../components/Section.tsx'

export function Paper() {
  return (
    <>
      <PageHeader
        eyebrow="Paper"
        title="The paper reports the explanation and the prediction ladder in full."
        dek="A short research paper with methods, results and limitations, built from the same result files as this site."
      />
      <Section id="status" title="Status">
        <Callout variant="info" title="In preparation">
          <p>The PDF will appear here, with a download button and a citation, once the paper is built from the final results.</p>
        </Callout>
      </Section>
    </>
  )
}
