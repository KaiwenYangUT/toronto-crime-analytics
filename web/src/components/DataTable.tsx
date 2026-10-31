import { useMemo, useState, type ReactNode } from 'react'
import s from './ui.module.css'

export interface Column<T> {
  key: string
  header: string
  /** right-aligned, tabular numerals, sortable by `sortValue` */
  num?: boolean
  render: (row: T) => ReactNode
  sortValue?: (row: T) => number | string
}

interface Props<T> {
  caption: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Phones: turn each row into a card (default). Set false for a short two-column table that fits as a table. */
  stack?: boolean
}

export function DataTable<T>({ caption, columns, rows, rowKey, stack = true }: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key)
    if (!sort || !col?.sortValue) return rows
    const get = col.sortValue
    return [...rows].sort((a, b) => {
      const x = get(a)
      const y = get(b)
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
    })
  }, [rows, columns, sort])
  const sortable = columns.filter((c) => c.sortValue)
  return (
    <div className={stack ? `${s.tableWrap} ${s.tableStack}` : s.tableWrap} role="region" aria-label={caption} tabIndex={0}>
      {stack && sortable.length > 0 && (
        <label className={s.sortSelect}>
          Sort by
          <select
            value={sort ? `${sort.key}:${sort.dir}` : ''}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(':')
              setSort(key ? { key, dir: dir === '-1' ? -1 : 1 } : null)
            }}
          >
            <option value="">Default order</option>
            {sortable.flatMap((c) => [
              <option key={`${c.key}:1`} value={`${c.key}:1`}>{c.header}, low to high</option>,
              <option key={`${c.key}:-1`} value={`${c.key}:-1`}>{c.header}, high to low</option>,
            ])}
          </select>
        </label>
      )}
      <table className={s.table}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={c.num ? s.num : undefined}
                aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
              >
                {c.sortValue ? (
                  <button
                    type="button"
                    className={s.sortBtn}
                    onClick={() => setSort((p) => ({ key: c.key, dir: p?.key === c.key && p.dir === 1 ? -1 : 1 }))}
                  >
                    {c.header}
                    <span aria-hidden="true">{sort?.key === c.key ? (sort.dir === 1 ? '↑' : '↓') : ''}</span>
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.header} className={c.num ? s.num : undefined}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
