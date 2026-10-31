import { PageHeader } from '../components/PageHeader.tsx'
import p from './pages.module.css'

export function About() {
  return (
    <>
      <PageHeader eyebrow="About" title="Three University of Toronto course projects, rebuilt as one checked analysis." />
      <div className={p.pageGrid}>
        <div className={p.pageMain}>
          <section id="credits" aria-labelledby="credits-h" className={p.credit}>
            <h2 id="credits-h">Credits</h2>
            <p>
              This site and paper combine three course projects on Toronto Police open data: a robbery classification study (JSC370), a logistic-regression report (STA303) and an interactive crime explorer (STA313). The analysis was re-implemented in Python and extended.
            </p>
            <p>
              Thanks to the course teaching teams, the Toronto Police Service and the City of Toronto. Basemap tiles use OpenStreetMap data (ODbL) via Protomaps.
            </p>
            <p>
              <a href="https://github.com/KaiwenYangUT/toronto-crime-analytics#readme">Code and README on GitHub</a>
            </p>
          </section>
        </div>
        <aside className={p.pageAside} aria-labelledby="licences-h" id="licences">
          <h2 id="licences-h" className={p.sub} style={{ marginTop: 0 }}>Licences and data</h2>
          <p className={p.fine}>
            Incident data: Toronto Police Service open data, Open Government Licence – Ontario. Reported incidents only, with no warranty.
          </p>
          <p className={p.fine}>Census profiles: City of Toronto, Open Government Licence – Toronto.</p>
          <p className={p.fine}>An independent analysis, not endorsed by either organization.</p>
        </aside>
      </div>
    </>
  )
}
