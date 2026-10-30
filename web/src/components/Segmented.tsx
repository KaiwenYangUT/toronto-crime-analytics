import * as ToggleGroup from '@radix-ui/react-toggle-group'
import s from './ui.module.css'

interface Props<V extends string> {
  label: string
  value: V
  onChange: (v: V) => void
  options: { value: V; label: string }[]
}

export function Segmented<V extends string>({ label, value, onChange, options }: Props<V>) {
  return (
    <ToggleGroup.Root
      type="single"
      className={s.segmented}
      value={value}
      aria-label={label}
      onValueChange={(v) => v && onChange(v as V)}
    >
      {options.map((o) => (
        <ToggleGroup.Item key={o.value} value={o.value} className={s.segItem}>
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
