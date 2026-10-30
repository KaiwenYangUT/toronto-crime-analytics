import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'
import { ThemeToggle } from './ThemeToggle.tsx'
import s from './ui.module.css'

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/explain', label: 'Explain' },
  { to: '/predict', label: 'Predict' },
  { to: '/paper', label: 'Paper' },
  { to: '/methods', label: 'Methods' },
  { to: '/about', label: 'About' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }
  return (
    <div className={s.shell}>
      <a className={s.skip} href="#main">
        Skip to content
      </a>
      <header className={s.header}>
        <div className={s.headerInner}>
          <NavLink to="/" className={s.brand}>
            <span className={s.brandLong}>Toronto robbery vs property crime</span>
            <span className={s.brandShort}>Robbery vs property crime</span>
          </NavLink>
          <nav className={s.nav} aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={s.navLink}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className={s.headerRight}>
            <div className={s.themeDesktop}><ThemeToggle /></div>
            <button
              type="button"
              className={s.menuButton}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((o) => !o)}
            >
              Menu
            </button>
          </div>
        </div>
        <nav id="mobile-nav" className={s.mobileNav} data-open={open} aria-label="Main (menu)">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={s.navLink}>
              {n.label}
            </NavLink>
          ))}
          <div className={s.themeMobile}><ThemeToggle /></div>
        </nav>
      </header>
      <main id="main" className={s.main} tabIndex={-1}>
        {children}
      </main>
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <span>
            Data: Toronto Police Service Public Safety Data Portal, open data under the Open Government Licence – Toronto.
            Counts are reported incidents, not risk.
          </span>
          <NavLink to="/methods#reproducibility">Reproducibility</NavLink>
          <NavLink to="/about">Licences</NavLink>
          <span className="tnum">Build {__BUILD_SHA__}</span>
        </div>
      </footer>
    </div>
  )
}
