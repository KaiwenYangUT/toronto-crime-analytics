import { useEffect, useRef } from 'react'
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
}

const MODE_LABEL: Record<Mode, string> = { city: 'Citywide', destination: 'Near a destination', station: 'Near its nearest listed station' }

export function FilterPanel({ state, categories, catColors, dateMin, dateMax, onChange, onReset, onPresetFig5, open, onClose }: Props) {
  const head = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (open) head.current?.focus()
  }, [open])
  const preset = PRESETS.find((p) => p.value === state.preset)
  const check = (c: string, on: boolean) => onChange({ cats: on ? categories.filter((x) => x === c || state.cats.includes(x)) : state.cats.filter((x) => x !== c) })
  return (
    <>
      <div className={s.backdrop} data-open={open} onClick={onClose} aria-hidden="true" />
      <form
        className={s.panel}
        data-open={open}
        aria-label="Filters"
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className={s.panelHead}>
          <h2 ref={head} tabIndex={-1} style={{ fontSize: 'var(--text-lg)' }}>Filters</h2>
          <button type="button" className={`${ui.btn} ${s.closeBtn}`} onClick={onClose}>Show results</button>
        </div>

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
              {state.mode === 'station' && <p className={s.hint}>The nearest listed station is one of the stations in this data, not necessarily the nearest station.</p>}
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
          <div className={s.dates}>
            <label className={s.hint}>From<input type="date" className={s.date} min={dateMin} max={dateMax} value={state.from || dateMin} onChange={(e) => onChange({ from: e.target.value === dateMin ? '' : e.target.value })} /></label>
            <label className={s.hint}>To<input type="date" className={s.date} min={dateMin} max={dateMax} value={state.to || dateMax} onChange={(e) => onChange({ to: e.target.value === dateMax ? '' : e.target.value })} /></label>
          </div>
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

        <div className={ui.figureActions}>
          <button type="button" className={ui.btn} onClick={onPresetFig5}>Course report Figure 5: 2020 robberies</button>
          <button type="button" className={ui.btn} onClick={onReset}>Reset filters</button>
        </div>
      </form>
    </>
  )
}
