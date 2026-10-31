import type { ReactNode } from 'react'
import s from './ui.module.css'

interface Props {
  id?: string
  /** The takeaway of the section, written as a sentence. It is the section's h2. */
  title: ReactNode
  /** The main visual: 8 of 12 columns from 1024 px, first when stacked. */
  figure: ReactNode
  /** Stat cards, 2 to 4 bullets and the caveat: 4 of 12 columns, below the figure when stacked. */
  aside?: ReactNode
  /** Full-width content below the figure and aside, such as a Disclosure. */
  children?: ReactNode
}

export function ResultSection({ id, title, figure, aside, children }: Props) {
  return (
    <section id={id} className={s.resultSection} aria-labelledby={id ? `${id}-h` : undefined}>
      <h2 id={id ? `${id}-h` : undefined}>{title}</h2>
      <div className={aside ? s.resultGrid : s.resultGridSolo}>
        <div className={s.resultFigure}>{figure}</div>
        {aside && <aside className={s.resultAside}>{aside}</aside>}
      </div>
      {children && <div className={s.resultMore}>{children}</div>}
    </section>
  )
}
