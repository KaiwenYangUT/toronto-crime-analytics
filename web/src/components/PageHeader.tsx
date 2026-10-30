import type { ReactNode } from 'react'
import { Link } from 'react-router'
import s from './ui.module.css'

interface Props {
  eyebrow: string
  /** The page's finding in one sentence. */
  title: ReactNode
  dek?: ReactNode
  /** Results keys the page draws on; links to the reproducibility section. */
  sources?: string[]
}

export function PageHeader({ eyebrow, title, dek, sources }: Props) {
  return (
    <header className={s.pageHeader}>
      <p className={s.eyebrow}>{eyebrow}</p>
      <h1>{title}</h1>
      {dek && <p className={s.dek}>{dek}</p>}
      {sources && sources.length > 0 && (
        <Link className={s.sourceChip} to="/methods#reproducibility">
          Source:{' '}
          {sources.map((k, i) => (
            <span key={k} style={{ whiteSpace: 'nowrap' }}>
              <code>{k}</code>
              {i < sources.length - 1 ? ',' : ''}
            </span>
          ))}
        </Link>
      )}
    </header>
  )
}
