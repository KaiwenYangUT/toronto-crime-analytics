import type { ReactNode } from 'react'
import s from './ui.module.css'

export function Legend({ items, label }: { items: { key: string; glyph: ReactNode; text: string }[]; label: string }) {
  return (
    <ul className={s.legend} aria-label={label}>
      {items.map((i) => (
        <li key={i.key} className={s.legendItem}>
          <svg width="28" height="14" aria-hidden="true">{i.glyph}</svg>
          <span>{i.text}</span>
        </li>
      ))}
    </ul>
  )
}
