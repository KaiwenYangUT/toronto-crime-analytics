import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import s from './ui.module.css'

export interface StatCardProps {
  label: string
  /** Usually a <Num k="…"/>. */
  value: ReactNode
  unit?: string
  /** The interval line, for example "95% CI 0.41 to 0.52". */
  ci?: ReactNode
  /** One line: what the number says. */
  meaning: ReactNode
  /** Shown behind a Details toggle: "What this does not mean". */
  notMean?: ReactNode
  /** Makes the whole card a link. */
  to?: string
  /** `display` is the 56 px Overview size; the default is 44 px. */
  size?: 'default' | 'display'
}

/** One number with its unit, interval and meaning. Provenance lives in the <Num> tooltip, not on the card. */
export function StatCard({ label, value, unit, ci, meaning, notMean, to, size = 'default' }: StatCardProps) {
  const [open, setOpen] = useState(false)
  const panel = useId()
  const body = (
    <>
      <p className={s.statLabel}>{label}</p>
      <p className={size === 'display' ? s.statValueDisplay : s.statValue}>{value}</p>
      {unit && <p className={s.statUnit}>{unit}</p>}
      {ci && <p className={s.statCi}>{ci}</p>}
      <p className={s.statMeaning}>{meaning}</p>
    </>
  )
  const details = notMean ? (
    <>
      <button type="button" className={s.statToggle} aria-expanded={open} aria-controls={panel} onClick={() => setOpen((o) => !o)}>
        Details
        <svg className={open ? s.statChevronOpen : s.statChevron} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m3 6 5 5 5-5" />
        </svg>
      </button>
      {open && (
        <p id={panel} className={s.statNot}>
          <strong>What this does not mean: </strong>
          {notMean}
        </p>
      )}
    </>
  ) : null
  // A linked card cannot contain the Details button, so the link wraps only the facts.
  return (
    <article className={s.stat}>
      {to ? <Link to={to} className={s.statLink}>{body}</Link> : body}
      {details}
    </article>
  )
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={s.statGrid}>{children}</div>
}
