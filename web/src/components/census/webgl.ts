// Decides whether the three-dimensional view is offered. Pure functions over small interfaces, so tests can pass mocks.

export interface CanvasHost {
  createElement(tag: 'canvas'): { getContext(id: string): unknown }
}

export interface MediaHost {
  matchMedia(query: string): { matches: boolean }
}

/** True when the browser can create a WebGL context. Plotly's gl3d traces need it. */
export function detectWebGL(doc: CanvasHost): boolean {
  try {
    const canvas = doc.createElement('canvas')
    for (const id of ['webgl2', 'webgl', 'experimental-webgl']) {
      if (canvas.getContext(id)) return true
    }
    return false
  } catch {
    return false
  }
}

export type Support = { ok: true } | { ok: false; reason: 'no-webgl' | 'reduced-motion' }

export function evaluateSupport(win: MediaHost, doc: CanvasHost): Support {
  if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) return { ok: false, reason: 'reduced-motion' }
  if (!detectWebGL(doc)) return { ok: false, reason: 'no-webgl' }
  return { ok: true }
}

/** The note shown in the flat view when rotation is not offered. */
export function flatNote(reason: 'no-webgl' | 'reduced-motion'): string {
  return reason === 'reduced-motion'
    ? 'Rotation is off because your system asks for reduced motion. The flat view shows the same data.'
    : 'Rotation is off because this browser cannot draw three-dimensional graphics. The flat view shows the same data.'
}

export const WIDE_QUERY = '(min-width: 1024px)'
export const FINE_QUERY = '(pointer: fine)'
export const COARSE_QUERY = '(pointer: coarse)'

/** From 1024 px with a fine pointer the chunk is fetched as the figure scrolls into view. */
export function shouldPrefetch(win: MediaHost): boolean {
  return win.matchMedia(WIDE_QUERY).matches && win.matchMedia(FINE_QUERY).matches
}

/** Under 1024 px, or with a coarse pointer, the canvas ignores touches until the reader presses Interact. */
export function needsInteractGate(win: MediaHost): boolean {
  return !win.matchMedia(WIDE_QUERY).matches || win.matchMedia(COARSE_QUERY).matches
}
