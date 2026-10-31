import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useMatches } from 'react-router'
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

const README_URL = 'https://github.com/KaiwenYangUT/toronto-crime-analytics#readme'

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const matches = useMatches()
  // Explore is a dashboard and uses the whole viewport; a route can also opt in with `handle = { fullWidth: true }`.
  const wide = pathname === '/explore' || pathname.startsWith('/explore/') || matches.some((m) => (m.handle as { fullWidth?: boolean } | undefined)?.fullWidth)
  const header = useRef<HTMLElement>(null)
  // --nav-h is the header's real height (it grows when the mobile menu is open); sticky offsets read it.
  useEffect(() => {
    const el = header.current
    if (!el) return
    const set = () => document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }
  return (
    <div className={wide ? `${s.shell} ${s.shellWide}` : s.shell}>
      <a className={s.skip} href="#main">
        Skip to content
      </a>
      <header className={s.header} ref={header}>
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
            <div className={s.themeSlot}><ThemeToggle /></div>
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
        </nav>
      </header>
      <main id="main" className={wide ? `${s.main} ${s.mainWide}` : s.main} tabIndex={-1}>
        {children}
      </main>
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <span>
            Data: Toronto Police Service Public Safety Data Portal, open data under the Open Government Licence – Ontario.
            Counts are reported incidents, not risk.
          </span>
          <a href={README_URL}>Code and README</a>
          <NavLink to="/about">Licences</NavLink>
          <span className="tnum">Build {__BUILD_SHA__}</span>
        </div>
      </footer>
    </div>
  )
}
