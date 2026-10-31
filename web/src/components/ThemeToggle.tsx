import { useSyncExternalStore } from 'react'
import s from './ui.module.css'

type Theme = 'light' | 'dark'
const listeners = new Set<() => void>()
const query = () => window.matchMedia('(prefers-color-scheme: dark)')

function stored(): Theme | null {
  try {
    const t = localStorage.getItem('tca-theme')
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* storage can be blocked; follow the system setting */
  }
  return null
}

/** The theme in effect: the stored choice, else the system setting. */
function read(): Theme {
  return stored() ?? (query().matches ? 'dark' : 'light')
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  const mq = query()
  mq.addEventListener('change', cb)
  window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    mq.removeEventListener('change', cb)
    window.removeEventListener('storage', cb)
  }
}

function choose(t: Theme) {
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem('tca-theme', t)
  } catch {
    /* the choice still applies for this visit */
  }
  listeners.forEach((l) => l())
}

/**
 * One icon button. With no stored choice the theme follows the system, live; a click stores light or
 * dark. There is no "System" option: clearing site data returns to following the system. Until the
 * component has mounted it draws a neutral half-and-half icon, so server and client markup match.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, read, () => null)
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className={s.themeButton}
      aria-pressed={dark}
      aria-label="Dark theme"
      title="Dark theme"
      onClick={() => choose(dark ? 'light' : 'dark')}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === null ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
          </>
        ) : dark ? (
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  )
}
