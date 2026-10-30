import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader.tsx'
import { Section } from '../components/Section.tsx'

export function About() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Three University of Toronto course projects, rebuilt as one checked analysis."
        dek="What this is, where the data come from, and how it may be used."
      />
      <div className="prose">
        <Section id="credits" title="Credits">
          <p>
            This site and paper combine three course projects on Toronto Police open data: a robbery classification study (JSC370), a logistic-regression inference report
            (STA303) and an interactive crime explorer (STA313). The analysis was re-implemented in Python, re-checked against the original R results and then extended; see{' '}
            <Link to="/methods#reproducibility">Reproducibility</Link>.
          </p>
        </Section>
        <Section id="acknowledgements" title="Acknowledgements">
          <p>
            Thanks to the course teaching teams and to the Toronto Police Service and the City of Toronto for publishing the data. Basemap tiles are built from OpenStreetMap data (©
            OpenStreetMap contributors, ODbL) by Protomaps.
          </p>
        </Section>
        <Section id="licences" title="Licences and data">
          <p>
            Data are the Toronto Police Service Public Safety Data Portal open data, used under the Open Government Licence – Toronto; the Toronto Police Service makes no warranty about
            them and they describe reported incidents only. Census income measures come from Statistics Canada via the City of Toronto. The code licence and the data licence notice
            are set out in the repository at release.
          </p>
        </Section>
      </div>
    </>
  )
}
