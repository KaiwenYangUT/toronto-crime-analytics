import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import type { Spec } from '../../lib/chart.ts'
import { useResults } from '../../lib/results.ts'
import type { ChartSvgs } from '../../lib/vegaServer.ts'
import { Figure } from '../Figure.tsx'
import { loadPlotly, mountScene, type Scene } from './plot3d.ts'
import { formatsOf, summaryText, tableRows } from './text.ts'
import type { CensusScatterData } from './types.ts'
import { detectWebGL, flatNote, needsInteractGate, shouldPrefetch } from './webgl.ts'
import s from './census.module.css'

export interface CensusScatterProps {
  /** `values` of results `predict.census_scatter`. Render inside the page's ResultsProvider. */
  data: CensusScatterData
  /** the flat Vega-Lite spec (censusScatter2d) */
  spec: Spec
  /** its prerendered SVGs */
  svgs: ChartSvgs
}

type Availability = 'pending' | 'ok' | 'no-webgl' | 'reduced-motion'

let webglCache: boolean | undefined
const hasWebGL = () => (webglCache ??= detectWebGL(document))

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', cb)
    return () => mq.removeEventListener('change', cb)
  }
}

function useAvailability(): Availability {
  return useSyncExternalStore(
    subscribeMedia('(prefers-reduced-motion: reduce)'),
    () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced-motion' : hasWebGL() ? 'ok' : 'no-webgl'),
    () => 'pending',
  )
}

const WIDTH_POINTER = ['(min-width: 1024px)', '(pointer: fine)', '(pointer: coarse)']
const subscribeLayout = (cb: () => void) => {
  const offs = WIDTH_POINTER.map((q) => subscribeMedia(q)(cb))
  return () => offs.forEach((off) => off())
}

/** Re-evaluates a width / pointer test when the media queries change. Server and first client render: false. */
function useMediaTest(test: (win: Window) => boolean): boolean {
  return useSyncExternalStore(subscribeLayout, () => test(window), () => false)
}

function Tool({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={s.tool} aria-label={label} onClick={onClick}>
      {label}
    </button>
  )
}

/**
 * First paint is the flat figure with its data table. In the browser, when WebGL is available and the
 * reader has not asked for reduced motion, a button swaps the same box for a rotatable three-dimensional
 * view whose library loads on demand (or just before, on wide screens with a mouse).
 */
export function CensusScatter({ data, spec, svgs }: CensusScatterProps) {
  const results = useResults()
  const formats = useMemo(() => formatsOf(results), [results])
  const rows = useMemo(() => tableRows(data, formats), [data, formats])
  const summary = useMemo(() => summaryText(data, results), [data, results])

  const availability = useAvailability()
  const prefetch = useMediaTest(shouldPrefetch)
  const gated = useMediaTest(needsInteractGate)

  const root = useRef<HTMLDivElement>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [interactive, setInteractive] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const scene = useRef<Scene | null>(null)

  // The host sits inside the Figure's chart box, so the 3D view takes the flat chart's place.
  const attach = useCallback((el: HTMLDivElement | null) => {
    root.current = el
    if (!el) return
    const body = el.querySelector<HTMLElement>('[class*="figureBody"]') ?? el.querySelector('figure')
    if (!body) return
    const box = document.createElement('div')
    box.setAttribute('data-census-host', '')
    body.appendChild(box)
    setHost(box)
  }, [])
  useEffect(
    () => () => {
      host?.remove()
    },
    [host],
  )

  // Fetch the chunk ahead of the click when the figure scrolls into view (wide screen, mouse).
  useEffect(() => {
    const el = root.current
    if (availability !== 'ok' || !prefetch || !el || typeof IntersectionObserver === 'undefined') return
    let idle = 0
    const win = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (h: number) => void }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      const go = () => void loadPlotly().catch(() => {})
      idle = win.requestIdleCallback ? win.requestIdleCallback(go) : window.setTimeout(go, 200)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      if (idle) win.cancelIdleCallback?.(idle)
    }
  }, [availability, prefetch])

  const open3d = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await loadPlotly()
      setMode('3d')
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  // Draw the scene while the 3D view is showing; follow the theme and the box size live.
  useEffect(() => {
    const el = stage.current
    if (mode !== '3d' || !el) return
    let cancelled = false
    let live: Scene | null = null
    const cleanups: (() => void)[] = []
    mountScene(el, data, formats).then(
      (sc) => {
        if (cancelled) return sc.destroy()
        live = sc
        scene.current = sc
        const restyle = () => sc.restyle()
        const mo = new MutationObserver(restyle)
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        mq.addEventListener('change', restyle)
        const ro = new ResizeObserver(() => sc.resize())
        ro.observe(el)
        cleanups.push(() => mo.disconnect(), () => mq.removeEventListener('change', restyle), () => ro.disconnect())
      },
      () => {
        if (cancelled) return
        setFailed(true)
        setMode('2d')
      },
    )
    return () => {
      cancelled = true
      cleanups.forEach((c) => c())
      live?.destroy()
      scene.current = null
    }
  }, [mode, data, formats])

  const showFlat = () => {
    setMode('2d')
    setInteractive(false)
  }

  const onReset = () => scene.current?.reset()
  const onRotateLeft = () => scene.current?.rotate('left')
  const onRotateRight = () => scene.current?.rotate('right')
  const onZoomIn = () => scene.current?.zoom('in')
  const onZoomOut = () => scene.current?.zoom('out')
  const onInteract = () => setInteractive((v) => !v)

  const note =
    availability === 'no-webgl' || availability === 'reduced-motion' ? flatNote(availability) : null

  return (
    <div className={s.root} ref={attach} data-testid="census-scatter" data-mode={mode}>
      <Figure
        title="Neighbourhoods by job ratio, income and robberies, 2020"
        spec={spec}
        svg={svgs}
        description={summary}
        table={rows}
        minHeight={320}
      />
      {host &&
        createPortal(
          <div className={s.host}>
            {mode === '3d' && (
              <>
                <div
                  role="img"
                  aria-label={summary}
                  data-testid="census-stage"
                  className={`${s.stage} ${gated && !interactive ? s.locked : ''} ${interactive ? s.interactive : ''}`}
                >
                  {/* Plotly owns this inner node (it adds classes to it), so React never re-renders its attributes */}
                  <div ref={stage} />
                </div>
                <div className={s.toolbar} role="group" aria-label="Three-dimensional view controls">
                  <Tool label="Reset view" onClick={onReset} />
                  <Tool label="Rotate left" onClick={onRotateLeft} />
                  <Tool label="Rotate right" onClick={onRotateRight} />
                  <Tool label="Zoom in" onClick={onZoomIn} />
                  <Tool label="Zoom out" onClick={onZoomOut} />
                  {gated && <Tool label={interactive ? 'Done' : 'Interact'} onClick={onInteract} />}
                  <Tool label="Show 2D" onClick={showFlat} />
                </div>
                <p className={s.note}>
                  {gated && !interactive
                    ? 'Press Interact to drag and pinch the view. Until then the page scrolls normally.'
                    : 'Drag to rotate, scroll or pinch to zoom, or use the buttons. Hover or tap a point for its neighbourhood.'}
                </p>
              </>
            )}
            {mode === '2d' && availability === 'ok' && (
              <div className={s.toolbar}>
                <button type="button" className={`${s.tool} ${s.primary}`} disabled={busy} onClick={open3d}>
                  {busy ? 'Loading the rotating view' : 'Rotate in three dimensions'}
                </button>
              </div>
            )}
            {mode === '2d' && note && <p className={s.note}>{note}</p>}
            <p className={failed ? `${s.note} ${s.error}` : s.note} role="status">
              {failed ? 'The rotating view could not load, so the flat view stays. The data table has the same values.' : ''}
            </p>
          </div>,
          host,
        )}
    </div>
  )
}
