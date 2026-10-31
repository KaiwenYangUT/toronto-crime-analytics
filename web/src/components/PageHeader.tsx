import type { ReactNode } from 'react'
import s from './ui.module.css'

interface Props {
  eyebrow: string
  /** The page's finding in one sentence, about 75 characters at most. */
  title: ReactNode
  /** One sentence under the title. */
  dek?: ReactNode
  /** The question the page answers, when the title is not already phrased as one. */
  question?: ReactNode
}

/** Spans the full container width; the title is not capped, only the dek keeps the reading measure. */
export function PageHeader({ eyebrow, title, dek, question }: Props) {
  return (
    <header className={s.pageHeader}>
      <p className={s.eyebrow}>{eyebrow}</p>
      <h1>{title}</h1>
      {question && (
        <p className={s.question}>
          <span className={s.questionTag}>The question</span> {question}
        </p>
      )}
      {dek && <p className={s.dek}>{dek}</p>}
    </header>
  )
}
