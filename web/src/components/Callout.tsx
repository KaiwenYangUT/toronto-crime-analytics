import type { ReactNode } from 'react'
import s from './ui.module.css'

type Variant = 'info' | 'caveat' | 'warning'
const LABEL: Record<Variant, string> = { info: 'Note', caveat: 'Caveat', warning: 'Warning' }
const CLASS: Record<Variant, string> = { info: s.calloutInfo, caveat: s.calloutCaveat, warning: s.calloutWarning }

function Icon({ variant }: { variant: Variant }) {
  const d =
    variant === 'info'
      ? 'M12 8v.01M11 12h1v5h1'
      : variant === 'caveat'
        ? 'M12 7v6M12 17v.01'
        : 'M12 4 3 20h18L12 4zM12 10v4M12 17v.01'
  return (
    <svg className={s.calloutIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {variant !== 'warning' && <circle cx="12" cy="12" r="9" />}
      <path d={d} />
    </svg>
  )
}

export function Callout({ variant = 'info', title, children }: { variant?: Variant; title?: string; children: ReactNode }) {
  return (
    <aside className={`${s.callout} ${CLASS[variant]}`}>
      <Icon variant={variant} />
      <div className={s.calloutBody}>
        <p className={s.calloutTitle}>{title ?? LABEL[variant]}</p>
        {children}
      </div>
    </aside>
  )
}
