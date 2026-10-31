import type { ReactNode } from 'react'
import { StatCard, type StatCardProps } from './StatCard.tsx'
import s from './ui.module.css'

/**
 * Kept so pages that have not moved to StatCard still compile. It renders a StatCard; `sourceKey`
 * is accepted and no longer shown (provenance is the <Num> tooltip). Pages migrate in R2/R3.
 */
export function FindingCard({ sourceKey, ...card }: StatCardProps & { sourceKey?: string }) {
  void sourceKey
  return <StatCard {...card} />
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className={s.cards}>{children}</div>
}
