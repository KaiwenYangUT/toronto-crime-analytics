import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { csvOf, type Spec } from '../lib/chart.ts'
import { VegaChart } from '../components/VegaChart.tsx'
import type { TableRow } from '../components/Figure.tsx'
import ui from '../components/ui.module.css'
import s from './explore.module.css'

interface Props {
  id: string
  /** visible heading; omit when `controls` already names the card (then pass `srTitle`) */
  title?: string
  srTitle?: string
  /** a small control in the header, between the title and the Data menu */
  controls?: ReactNode
  spec: Spec
  /** numeric chart height in px; the card body is exactly this tall */
  height: number
  description: string
  table: TableRow[]
  csvName: string
  /** extra Data menu entries (page-specific exports) */
  menuExtra?: ReactNode
  footnote?: ReactNode
  onSignal?: { name: string; handler: (value: unknown) => void }
  /** open the Data menu upward (for the last card, so the column does not clip it) */
  menuUp?: boolean
}

function download(name: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const isNumeric = (v: string | number | null) => typeof v === 'number' || /^[<−-]?\s?[\d.,]+%?$/.test(String(v ?? ''))

/** The same "Data" menu as Figure (table, CSV, extras), sized for a dashboard card. */
function DataMenu({ label, up, children }: { label: string; up?: boolean; children: ReactNode }) {
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
    <div className={`${ui.dataMenu} ${s.menuSlot}`} ref={root}>
      <button ref={button} type="button" className={ui.btn} aria-expanded={open} aria-controls={open ? panel : undefined} aria-label={label} onClick={() => setOpen((o) => !o)}>
        Data
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m3 6 5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div id={panel} className={`${ui.dataMenuPanel} ${up ? s.menuUp : ''}`} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

export function ChartCard({ id, title, srTitle, controls, spec, height, description, table, csvName, menuExtra, footnote, onSignal, menuUp }: Props) {
  const [showTable, setShowTable] = useState(false)
  const heading = title ?? srTitle ?? ''
  const cols = table.length ? Object.keys(table[0]) : []
  return (
    <section className={s.card} id={id} aria-label={heading}>
      <div className={s.cardHead}>
        {title ? <h2 className={s.cardTitle}>{title}</h2> : <h2 className="sr-only">{srTitle}</h2>}
        {controls}
        <DataMenu label={`Data options for ${heading}`} up={menuUp}>
          <button type="button" aria-expanded={showTable} onClick={() => setShowTable((v) => !v)}>
            {showTable ? 'Show the chart' : 'View data table'}
          </button>
          <button type="button" onClick={() => download(csvName, csvOf(table))}>Download table (CSV)</button>
          {menuExtra}
        </DataMenu>
      </div>
      <div className={s.cardBody} style={{ height }}>
        {showTable ? (
          <div className={s.cardTable} role="region" aria-label={`Data for ${heading}`} tabIndex={0}>
            <table className={ui.table}>
              <caption>{`Data plotted in: ${heading}`}</caption>
              <thead>
                <tr>{cols.map((c) => <th key={c} scope="col" className={isNumeric(table[0][c]) ? ui.num : undefined}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {table.map((r, i) => (
                  <tr key={i}>{cols.map((c) => <td key={c} className={isNumeric(r[c]) ? ui.num : undefined}>{r[c] ?? ''}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <VegaChart spec={spec} label={`${heading}. ${description}`} minHeight={height} onSignal={onSignal} />
        )}
      </div>
      {footnote && <p className={s.cardFoot}>{footnote}</p>}
    </section>
  )
}
