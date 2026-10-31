import { describe, expect, it } from 'vitest'
import { detectWebGL, evaluateSupport, flatNote, needsInteractGate, shouldPrefetch } from '../src/components/census/webgl.ts'

const doc = (contexts: Record<string, unknown> | 'throws') => ({
  createElement: () => ({
    getContext: (id: string) => {
      if (contexts === 'throws') throw new Error('blocked')
      return contexts[id] ?? null
    },
  }),
})
const win = (on: string[]) => ({ matchMedia: (q: string) => ({ matches: on.includes(q) }) })

describe('webgl detection', () => {
  it('accepts webgl2, webgl or the legacy id', () => {
    expect(detectWebGL(doc({ webgl2: {} }))).toBe(true)
    expect(detectWebGL(doc({ webgl: {} }))).toBe(true)
    expect(detectWebGL(doc({ 'experimental-webgl': {} }))).toBe(true)
  })
  it('is false when no context can be made or the browser throws', () => {
    expect(detectWebGL(doc({}))).toBe(false)
    expect(detectWebGL(doc('throws'))).toBe(false)
  })
})

describe('support decision', () => {
  it('stays flat for reduced motion even with WebGL', () => {
    expect(evaluateSupport(win(['(prefers-reduced-motion: reduce)']), doc({ webgl: {} }))).toEqual({ ok: false, reason: 'reduced-motion' })
  })
  it('stays flat without WebGL', () => {
    expect(evaluateSupport(win([]), doc({}))).toEqual({ ok: false, reason: 'no-webgl' })
  })
  it('offers 3D with WebGL and no motion preference', () => {
    expect(evaluateSupport(win([]), doc({ webgl2: {} }))).toEqual({ ok: true })
  })
  it('says why in the note', () => {
    expect(flatNote('reduced-motion')).toMatch(/reduced motion/)
    expect(flatNote('no-webgl')).toMatch(/cannot draw/)
  })
})

describe('prefetch and interaction gate', () => {
  it('prefetches only from 1024 px with a fine pointer', () => {
    expect(shouldPrefetch(win(['(min-width: 1024px)', '(pointer: fine)']))).toBe(true)
    expect(shouldPrefetch(win(['(pointer: fine)']))).toBe(false)
    expect(shouldPrefetch(win(['(min-width: 1024px)']))).toBe(false)
  })
  it('gates the canvas under 1024 px or with a coarse pointer', () => {
    expect(needsInteractGate(win([]))).toBe(true)
    expect(needsInteractGate(win(['(min-width: 1024px)', '(pointer: coarse)']))).toBe(true)
    expect(needsInteractGate(win(['(min-width: 1024px)', '(pointer: fine)']))).toBe(false)
  })
})
