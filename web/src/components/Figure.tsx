import { useRef, useState, type ReactNode } from 'react'
import type { View } from 'vega'
import { csvOf, type Spec } from '../lib/chart.ts'
import type { ChartSvgs } from '../lib/vegaServer.ts'
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
}

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function Figure({ title, subtitle, spec, svg, description, caption, source, table, minHeight, id }: Props) {
  const view = useRef<View | null>(null)
  const [showTable, setShowTable] = useState(false)
  const slug = (id ?? title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const cols = table && table.length ? Object.keys(table[0]) : []
  return (
    <figure className={s.figure} id={id}>
      <figcaption className={s.figureTitle}>{title}</figcaption>
      {subtitle && <p className={s.figureSub}>{subtitle}</p>}
      <div className={s.figureBody}>
        <VegaChart spec={spec} svg={svg} label={`${title}. ${description}`} viewRef={view} minHeight={minHeight} />
      </div>
      {caption && <p className={s.figureCaption}>{caption}</p>}
      {source && <p className={s.figureCaption}>{source}</p>}
      <div className={s.figureActions}>
        {table && (
          <button type="button" className={s.btn} aria-expanded={showTable} onClick={() => setShowTable((v) => !v)}>
            {showTable ? 'Hide data table' : 'View data table'}
          </button>
        )}
        {table && (
          <button type="button" className={s.btn} onClick={() => download(`${slug}.csv`, 'text/csv', csvOf(table))}>
            Download CSV
          </button>
        )}
        <button
          type="button"
          className={s.btn}
          onClick={async () => view.current && download(`${slug}.svg`, 'image/svg+xml', await view.current.toSVG())}
        >
          Download SVG
        </button>
      </div>
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
