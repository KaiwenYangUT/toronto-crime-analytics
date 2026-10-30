import type { ReactNode } from 'react'
import { Link } from 'react-router'
import s from './ui.module.css'

interface Props {
  label: string
  value: ReactNode
  unit?: string
  ci?: ReactNode
  meaning: ReactNode
  notMean?: ReactNode
  sourceKey: string
  to?: string
}

export function FindingCard({ label, value, unit, ci, meaning, notMean, sourceKey, to }: Props) {
  const body = (
    <>
      <p className={s.cardLabel}>{label}</p>
      <p className={s.cardValue}>{value}</p>
      {unit && <p className={s.cardUnit}>{unit}</p>}
      {ci && <p className={s.cardCi}>{ci}</p>}
      <p className={s.cardMeaning}>{meaning}</p>
      {notMean && <p className={s.cardNot}><strong>What this does not mean: </strong>{notMean}</p>}
      <p className={s.cardKey}>Source: <code>{sourceKey}</code></p>
    </>
  )
  return to ? <Link to={to} className={s.card}>{body}</Link> : <article className={s.card}>{body}</article>
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className={s.cards}>{children}</div>
}
