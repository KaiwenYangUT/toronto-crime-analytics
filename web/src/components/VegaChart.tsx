import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { View } from 'vega'
import { themed, type Mode, type Spec } from '../lib/chart.ts'
import type { ChartSvgs } from '../lib/vegaServer.ts'
import s from './chart.module.css'

interface Props {
  spec: Spec
  /** Build-time SVGs shown until the interactive chart loads. */
  svg?: ChartSvgs
  label: string
  viewRef?: MutableRefObject<View | null>
  minHeight?: number
  /** Listen to a Vega signal (for example an interval brush). */
  onSignal?: { name: string; handler: (value: unknown) => void }
}

function currentMode(): Mode {
  const t = document.documentElement.dataset.theme
  if (t === 'light' || t === 'dark') return t
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Vega draws interval-brush rectangles as unlabelled graphics; they carry no content for assistive technology. */
function hideDecoration(el: HTMLElement) {
  el.querySelectorAll('[class*="brush"], [class*="background"]').forEach((n) => {
    n.removeAttribute('role')
    n.setAttribute('aria-hidden', 'true')
  })
}

/** Prerendered SVG first; the interactive Vega view replaces it once the browser is idle. */
export function VegaChart({ spec, svg, label, viewRef, minHeight = 240, onSignal }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  const specKey = JSON.stringify(spec)
  const handler = useRef(onSignal?.handler)
  useEffect(() => {
    handler.current = onSignal?.handler
  })
  const signalName = onSignal?.name

  useEffect(() => {
    let cancelled = false
    let view: View | null = null
    const el = host.current
    if (!el) return
    const mount = async () => {
      const { default: embed } = await import('vega-embed')
      if (cancelled) return
      const result = await embed(el, themed({ width: 'container', ...JSON.parse(specKey) }, currentMode()) as never, {
        actions: false,
        renderer: 'svg',
        ariaLabel: label,
      } as never)
      if (cancelled) {
        result.finalize()
        return
      }
      view = result.view
      hideDecoration(el)
      if (signalName) view.addSignalListener(signalName, (_n, v) => handler.current?.(v))
      if (viewRef) viewRef.current = view
      setLive(true)
    }
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    const handle = idle ? idle(mount) : window.setTimeout(mount, 50)
    const remount = () => {
      view?.finalize()
      view = null
      void mount()
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', remount)
    const obs = new MutationObserver(remount)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      cancelled = true
      if (!idle) window.clearTimeout(handle)
      mq.removeEventListener('change', remount)
      obs.disconnect()
      view?.finalize()
      if (viewRef) viewRef.current = null
    }
  }, [specKey, label, viewRef, signalName])

  return (
    <div className={s.chart} style={{ minHeight }} role="img" aria-label={label}>
      {svg && !live && (
        <>
          <div className={s.svgLight} dangerouslySetInnerHTML={{ __html: svg.light }} />
          <div className={s.svgDark} dangerouslySetInnerHTML={{ __html: svg.dark }} />
        </>
      )}
      <div ref={host} className={s.live} />
    </div>
  )
}
