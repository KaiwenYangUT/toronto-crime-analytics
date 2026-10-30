import { useSyncExternalStore } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import s from './ui.module.css'

type Theme = 'system' | 'light' | 'dark'
const listeners = new Set<() => void>()

function read(): Theme {
  try {
    const t = localStorage.getItem('tca-theme')
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* storage can be blocked; fall back to the system setting */
  }
  return 'system'
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function apply(t: Theme) {
  const root = document.documentElement
  if (t === 'system') delete root.dataset.theme
  else root.dataset.theme = t
  try {
    if (t === 'system') localStorage.removeItem('tca-theme')
    else localStorage.setItem('tca-theme', t)
  } catch {
    /* the choice still applies for this visit */
  }
  listeners.forEach((l) => l())
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => 'system' as Theme)
  return (
    <ToggleGroup.Root
      type="single"
      className={s.toggle}
      value={theme}
      aria-label="Colour theme"
      onValueChange={(v) => v && apply(v as Theme)}
    >
      {(['system', 'light', 'dark'] as const).map((t) => (
        <ToggleGroup.Item key={t} value={t} className={s.toggleItem}>
          {t[0].toUpperCase() + t.slice(1)}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
