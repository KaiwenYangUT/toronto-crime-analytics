import { useContext, useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import type { View } from 'vega'
import { csvOf, type Spec } from '../lib/chart.ts'
import type { ChartSvgs } from '../lib/vegaServer.ts'
import { InFigureSlot } from './figureSlot.ts'
import { VegaChart } from './VegaChart.tsx'
import s from './ui.module.css'

export type TableRow = Record<string, string | number | null>

const isNumeric = (v: string | number | null) => typeof v === 'number' || /^[<−-]?\s?[\d.,]+%?$/.test(String(v ?? ''))

interface Props {
  title: string
  subtitle?: string
  spec: Spec
  svg?: ChartSvgs
  /** Plain-language description for assistive technology. */
  description: string
  caption?: ReactNode
  source?: ReactNode
  /** The plotted rows, shown on request and downloadable as CSV. */
  table?: TableRow[]
  minHeight?: number
  id?: string
  onSignal?: { name: string; handler: (value: unknown) => void }
  extraActions?: ReactNode
  /** only the data table and CSV actions, for small charts in a row */
  compact?: boolean
  /** omit the generic CSV button when the page offers its own full export */
  noCsv?: boolean
  /** a small control in the header row, left of the Data menu (for example a metric toggle) */
  controls?: ReactNode
  /** a legend, set under the chart so the chart starts higher on a phone */
  legend?: ReactNode
  /** set the legend between the subtitle and the chart, so a key for the marks is read before the marks (default: under the chart) */
  legendFirst?: boolean
  /** class and callback ref for the chart box, for components that mount extra content inside it */
  bodyClassName?: string
  bodyRef?: Ref<HTMLDivElement>
}

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/** One "Data" menu holds every action: the table toggle, CSV, SVG and any page-specific export. */
export function DataMenu({ children, label, up, className }: { children: ReactNode; label: string; up?: boolean; className?: string }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useId()
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div className={`${s.dataMenu} ${className ?? ''}`} ref={root}>
      <button ref={button} type="button" className={s.btn} aria-expanded={open} aria-controls={open ? panel : undefined} aria-label={label} onClick={() => setOpen((o) => !o)}>
        Data
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m3 6 5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div id={panel} className={`${s.dataMenuPanel} ${up ? s.dataMenuUp : ''}`} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

export function Figure({ title, subtitle, spec, svg, description, caption, source, table, minHeight, id, onSignal, extraActions, compact, noCsv, controls, legend, legendFirst, bodyClassName, bodyRef }: Props) {
  const inSection = useContext(InFigureSlot)
  const view = useRef<View | null>(null)
  const [showTable, setShowTable] = useState(false)
  const slug = (id ?? title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const cols = table && table.length ? Object.keys(table[0]) : []
  const hasMenu = Boolean(table) || Boolean(extraActions) || !compact
  return (
    <figure className={`${s.figure} ${inSection ? s.figureInSection : ''} ${subtitle ? s.hasSub : ''} ${controls ? s.hasControls : ''}`} id={id}>
      <figcaption className={s.figureTitle}>{title}</figcaption>
      {(hasMenu || controls) && (
        <div className={s.figureTools}>
          {controls}
          {hasMenu && (
          <DataMenu label={`Data options for ${title}`}>
            {table && (
              <button type="button" aria-expanded={showTable} onClick={() => setShowTable((v) => !v)}>
                {showTable ? 'Hide data table' : 'View data table'}
              </button>
            )}
            {table && !noCsv && (
              <button type="button" onClick={() => download(`${slug}.csv`, 'text/csv', csvOf(table))}>
                Download CSV
              </button>
            )}
            {extraActions}
            {!compact && (
              <button type="button" onClick={async () => {
                // before the live chart mounts, fall back to the prerendered SVG for the theme in effect
                const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
                const body = view.current ? await view.current.toSVG() : svg && (dark ? svg.dark : svg.light)
                if (body) download(`${slug}.svg`, 'image/svg+xml', body)
              }}>
                Download SVG
              </button>
            )}
          </DataMenu>
          )}
        </div>
      )}
      {subtitle && <p className={s.figureSub}>{subtitle}</p>}
      {legend && legendFirst && <div className={s.figureLegend}>{legend}</div>}
      <div className={`${s.figureBody} ${bodyClassName ?? ''}`} ref={bodyRef}>
        <VegaChart spec={spec} svg={svg} label={`${title}. ${description}`} viewRef={view} minHeight={minHeight} onSignal={onSignal} />
      </div>
      {legend && !legendFirst && <div className={s.figureLegend}>{legend}</div>}
      {caption && <p className={s.figureCaption}>{caption}</p>}
      {source && <p className={s.figureCaption}>{source}</p>}
      {table && showTable && (
        <div className={s.tableWrap} role="region" aria-label={`Data for ${title}`} tabIndex={0}>
          <table className={s.table}>
            <caption>{`Data plotted in: ${title}`}</caption>
            <thead>
              <tr>{cols.map((c) => <th key={c} scope="col" className={isNumeric(table[0][c]) ? s.num : undefined}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {table.map((r, i) => (
                <tr key={i}>{cols.map((c) => <td key={c} className={isNumeric(r[c]) ? s.num : undefined}>{r[c] ?? ''}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  )
}
