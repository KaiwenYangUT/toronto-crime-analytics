import type { ReactNode } from 'react'
import s from './ui.module.css'

export interface KeyPoint {
  text: ReactNode
  /** An optional lead-in number, usually a <Num k="…"/>, set large before the sentence. */
  stat?: ReactNode
}

/** Two to four short bullets; this is the page's text budget next to its visual. */
export function KeyPoints({ items, label }: { items: KeyPoint[]; label?: string }) {
  if (import.meta.env.DEV && (items.length < 2 || items.length > 4)) {
    console.warn(`KeyPoints: expected 2 to 4 bullets, got ${items.length}`)
  }
  return (
    <ul className={s.keyPoints} aria-label={label}>
      {items.map((p, i) => (
        <li key={i} className={s.keyPoint}>
          {p.stat ? <span className={s.keyStat}>{p.stat}</span> : <span className={s.keyMark} aria-hidden="true" />}
          <span>{p.text}</span>
        </li>
      ))}
    </ul>
  )
}
