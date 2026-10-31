import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import * as RadioGroup from '@radix-ui/react-radio-group'
import * as Slider from '@radix-ui/react-slider'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import ui from '../components/ui.module.css'
import { PLACES } from './useExplore.ts'
import { PRESETS, RADII_MAX, RADII_MIN, WEEKDAY_LABELS, type ExploreState, type Mode } from './state.ts'
import s from './explore.module.css'

interface Props {
  state: ExploreState
  categories: string[]
  catColors: Record<string, string>
  dateMin: string
  dateMax: string
  onChange: (p: Partial<ExploreState>) => void
  onReset: () => void
  onPresetFig5: () => void
  open: boolean
  onClose: () => void
  /** how many filter groups differ from the defaults */
  active: number
}

/**
 * A date input that applies a date only when it lies inside the data's range. Typing a year digit by digit
 * passes through years such as 0002 and 0202; those are held in the field but not applied.
 */
function DateField({ label, value, min, max, onCommit }: { label: string; value: string; min: string; max: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    setDraft(value)
  }
  return (
    <label className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      <input
        type="date"
        className={s.date}
        min={min}
        max={max}
        value={draft}
        onChange={(e) => {
          const v = e.target.value
          setDraft(v)
          if (v && v >= min && v <= max && v !== value) onCommit(v)
        }}
      />
    </label>
  )
}

const MODE_LABEL: Record<Mode, string> = { city: 'Citywide', destination: 'Near a destination', station: 'Near a destination’s nearest listed station' }

export function FilterPanel({ state, categories, catColors, dateMin, dateMax, onChange, onReset, onPresetFig5, open, onClose, active }: Props) {
  const head = useRef<HTMLHeadingElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)
  useEffect(() => {
    if (open) head.current?.focus()
  }, [open])
  // A fade at the bottom edge says "more below" until the list is scrolled to its end.
  const measure = useCallback(() => {
    const el = scroller.current
    if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
  }, [])
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [measure])
  const preset = PRESETS.find((p) => p.value === state.preset)
  const check = (c: string, on: boolean) => onChange({ cats: on ? categories.filter((x) => x === c || state.cats.includes(x)) : state.cats.filter((x) => x !== c) })
  // In the drawer the panel is modal: Escape closes it and Tab stays inside it.
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (!open) return
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const items = Array.from(form.current?.querySelectorAll<HTMLElement>('button, input, select, [tabindex]:not([tabindex="-1"]), [role="radio"], [role="checkbox"], [role="slider"]') ?? []).filter((n) => !n.hasAttribute('disabled') && n.offsetParent !== null)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    const at = document.activeElement
    if (e.shiftKey && (at === first || at === head.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && at === last) {
      e.preventDefault()
      first.focus()
    }
  }
  return (
    <>
      <div className={s.backdrop} data-open={open} onClick={onClose} aria-hidden="true" />
      <form
        ref={form}
        className={s.panel}
        data-open={open}
        aria-label="Filters"
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={onKeyDown}
      >
        <div className={s.panelHead}>
          <h2 ref={head} tabIndex={-1} className={s.panelTitle}>Filters{active > 0 ? <span className={s.panelCount}> ({active} active)</span> : null}</h2>
          <button type="button" className={`${ui.btn} ${s.closeBtn}`} onClick={onClose}>Show results</button>
        </div>
        <div className={s.panelScrollWrap}>
        <div className={s.panelScroll} ref={scroller} onScroll={measure}>
        <div className={s.panelFields}>

        <RadioGroup.Root className={s.group} value={state.mode} onValueChange={(v) => onChange({ mode: v as Mode })} aria-label="Where">
          <span className={s.label}>Where</span>
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <label key={m} className={s.row}>
              <RadioGroup.Item value={m} className={s.radio}><RadioGroup.Indicator className={s.radioDot} /></RadioGroup.Item>
              {MODE_LABEL[m]}
            </label>
          ))}
        </RadioGroup.Root>

        {state.mode !== 'city' && (
          <>
            <div className={s.group}>
              <label className={s.label} htmlFor="f-place">Destination</label>
              <select id="f-place" className={s.select} value={state.place} onChange={(e) => onChange({ place: e.target.value })}>
                {['tourist', 'student'].map((t) => (
                  <optgroup key={t} label={t === 'tourist' ? 'Tourist sites' : 'Student sites'}>
                    {PLACES.filter((p) => p.type === t).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className={s.group}>
              <label className={s.label} htmlFor="f-radius">Radius: {state.radius} m</label>
              <Slider.Root id="f-radius" className={s.sliderRoot} min={RADII_MIN} max={RADII_MAX} step={100} value={[state.radius]} onValueChange={([v]) => onChange({ radius: v })}>
                <Slider.Track className={s.sliderTrack}><Slider.Range className={s.sliderRange} /></Slider.Track>
                <Slider.Thumb className={s.sliderThumb} aria-label="Radius in metres" />
              </Slider.Root>
              {state.mode === 'station' && <p className={s.hint}>The circle is drawn around the listed station closest to the destination. The list may not include every nearby station.</p>}
            </div>
          </>
        )}

        <fieldset className={s.group}>
          <legend>Crime type</legend>
          {categories.map((c) => (
            <label key={c} className={s.row}>
              <Checkbox.Root className={s.checkbox} checked={state.cats.includes(c)} onCheckedChange={(v) => check(c, v === true)}>
                <Checkbox.Indicator>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m2 6 3 3 5-6" /></svg>
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span className={s.swatch} style={{ background: catColors[c] }} aria-hidden="true" />
              {c}
            </label>
          ))}
        </fieldset>

        <fieldset className={s.group}>
          <legend>Dates</legend>
          <DateField label="From" value={state.from || dateMin} min={dateMin} max={dateMax} onCommit={(v) => onChange({ from: v === dateMin ? '' : v })} />
          <DateField label="To" value={state.to || dateMax} min={dateMin} max={dateMax} onCommit={(v) => onChange({ to: v === dateMax ? '' : v })} />
          <p className={s.hint}>Dragging across the trend chart sets the same dates.</p>
        </fieldset>

        <div className={s.group}>
          <label className={s.label} htmlFor="f-preset">Time of year or day</label>
          <select id="f-preset" className={s.select} value={state.preset} onChange={(e) => onChange({ preset: e.target.value as ExploreState['preset'] })}>
            {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {preset?.note && <p className={s.hint}>{preset.note}</p>}
        </div>

        <div className={s.group}>
          <span className={s.label} id="f-days">Weekdays</span>
          <ToggleGroup.Root type="multiple" className={s.days} aria-labelledby="f-days" value={state.weekdays.map(String)} onValueChange={(v) => onChange({ weekdays: v.map(Number).sort() })}>
            {WEEKDAY_LABELS.map((d, i) => <ToggleGroup.Item key={d} value={String(i + 1)} className={s.day}>{d}</ToggleGroup.Item>)}
          </ToggleGroup.Root>
        </div>

        <div className={s.group}>
          <label className={s.label} htmlFor="f-hours">Hours: {String(state.hours[0]).padStart(2, '0')}:00 to {String(state.hours[1]).padStart(2, '0')}:59</label>
          <Slider.Root id="f-hours" className={s.sliderRoot} min={0} max={23} step={1} minStepsBetweenThumbs={0} value={state.hours} onValueChange={(v) => onChange({ hours: [v[0], v[1]] })}>
            <Slider.Track className={s.sliderTrack}><Slider.Range className={s.sliderRange} /></Slider.Track>
            <Slider.Thumb className={s.sliderThumb} aria-label="First hour" />
            <Slider.Thumb className={s.sliderThumb} aria-label="Last hour" />
          </Slider.Root>
        </div>

        <button type="button" className={ui.btn} onClick={onPresetFig5}>2020 robberies (as in the original report)</button>
        </div>
        </div>
        <div className={s.fade} data-more={more} aria-hidden="true" />
        </div>
        <div className={s.panelFoot}>
          <button type="button" className={`${ui.btn} ${s.resetBtn}`} onClick={onReset}>Reset filters</button>
        </div>
      </form>
    </>
  )
}
