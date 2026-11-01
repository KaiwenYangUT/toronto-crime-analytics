import { describe, expect, it } from 'vitest'
import { DEFAULT_EYE, rotateEye, zoomEye } from '../src/components/census/camera.ts'
import { AXIS_TITLES, COLORBAR_TITLE, buildLayout, buildTrace, colorscale, hoverText, readTheme, wrapTitle } from '../src/components/census/scene.ts'
import { formatsOf, summaryText, tableRows } from '../src/components/census/text.ts'
import type { CensusScatterData } from '../src/components/census/types.ts'
import explain from '../src/data/pages/explain.json'
import { numberText, type PageResults } from '../src/lib/results.ts'

const results = explain as unknown as PageResults
const data = (results.results['predict.census_scatter'] as { values: unknown }).values as CensusScatterData
const formats = formatsOf(results)

describe('camera', () => {
  it('default eye matches the plan', () => {
    expect(DEFAULT_EYE).toEqual({ x: 1.6, y: 1.6, z: 0.9 })
  })
  it('rotates about the vertical axis and keeps height and distance', () => {
    const r = rotateEye(DEFAULT_EYE, 15)
    expect(r.z).toBe(0.9)
    expect(Math.hypot(r.x, r.y)).toBeCloseTo(Math.hypot(1.6, 1.6))
    const back = rotateEye(r, -15)
    expect(back.x).toBeCloseTo(1.6)
    expect(back.y).toBeCloseTo(1.6)
    expect(rotateEye({ x: 1, y: 0, z: 0 }, 90).y).toBeCloseTo(1)
  })
  it('zooms within bounds', () => {
    const norm = (e: typeof DEFAULT_EYE) => Math.hypot(e.x, e.y, e.z)
    expect(norm(zoomEye(DEFAULT_EYE, 'in'))).toBeLessThan(norm(DEFAULT_EYE))
    expect(norm(zoomEye(DEFAULT_EYE, 'out'))).toBeGreaterThan(norm(DEFAULT_EYE))
    let e = DEFAULT_EYE
    for (let i = 0; i < 40; i++) e = zoomEye(e, 'in')
    expect(norm(e)).toBeCloseTo(0.8)
    for (let i = 0; i < 40; i++) e = zoomEye(e, 'out')
    expect(norm(e)).toBeCloseTo(6)
  })
})

describe('scene', () => {
  const style = (vars: Record<string, string>) => ({ getPropertyValue: (n: string) => vars[n] ?? '' })
  const ramp = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`--ramp-magnitude-${i + 1}`, `#00000${i}`]))
  const theme = readTheme(style({ '--bg': '#111', '--text': '#eee', '--text-muted': '#bbb', '--border': '#333', '--font-ui': 'Inter', ...ramp }))

  it('reads the theme from CSS variables and falls back when they are missing', () => {
    expect(theme.bg).toBe('#111')
    expect(theme.ramp[9]).toBe('#000009')
    expect(readTheme(style({})).ramp).toHaveLength(10)
  })
  it('colour scale runs 0..1 over the ramp', () => {
    const cs = colorscale(theme.ramp)
    expect(cs[0]).toEqual([0, '#000000'])
    expect(cs[9]).toEqual([1, '#000009'])
  })
  it('trace maps ratio, income and robberies to x, y and z with an outline', () => {
    const t = buildTrace(data, formats, theme)
    expect(t.type).toBe('scatter3d')
    expect(t.x).toHaveLength(data.points.length)
    expect(t.x[0]).toBe(data.points[0].ratio)
    expect(t.y[0]).toBe(data.points[0].income)
    expect(t.z[0]).toBe(data.points[0].robberies)
    expect(t.marker.line.color).toBe('#eee')
    expect(t.marker.colorbar.title.text).toBe(COLORBAR_TITLE)
    expect(t.marker.cmax).toBe(data.summary.max.robberies)
  })
  it('layout carries the axis titles, theme colours and the default camera only on request', () => {
    const l = buildLayout(theme)
    expect(l.scene.xaxis.title.text.replace('<br>', ' ')).toBe(AXIS_TITLES.x)
    expect(l.scene.yaxis.title.text).toBe('Individual median<br>income (CAD)')
    expect(l.scene.zaxis.title.text.replace('<br>', ' ')).toBe('Robberies reported in 2020')
    expect(l.scene.bgcolor).toBe('#111')
    expect('camera' in l.scene).toBe(true)
    expect('camera' in buildLayout(theme, { camera: false }).scene).toBe(false)
  })
  it('wraps long titles in two lines and builds a horizontal colour bar in narrow boxes', () => {
    expect(wrapTitle('Individual median income (CAD)')).toBe('Individual median<br>income (CAD)')
    expect(wrapTitle('Single')).toBe('Single')
    expect(buildTrace(data, formats, theme, true).marker.colorbar).toMatchObject({ orientation: 'h' })
    expect(buildTrace(data, formats, theme).marker.colorbar).not.toHaveProperty('orientation')
  })
  it('hover text uses the display decimals and escapes names', () => {
    const p = data.points[0]
    const h = hoverText(p, formats)
    expect(h).toContain(`Job-to-labour-force ratio: ${p.ratio.toFixed(3)}`)
    expect(h).toContain('Median income ($): 30,000')
    expect(hoverText({ ...p, name: 'A & <B>' }, formats)).toContain('A &amp; &lt;B&gt;')
  })
})

describe('text and table', () => {
  it('table cells are the formatted values', () => {
    const rows = tableRows(data, formats)
    expect(rows).toHaveLength(data.points.length)
    expect(rows[0]['Job ratio']).toBe(data.points[0].ratio.toFixed(3))
    expect(rows[0]['Median income (CAD)']).toBe('30,000')
  })
  it('summary uses the stored formats and never says risk is measured', () => {
    const t = summaryText(data, results)
    expect(t).toContain(numberText(results, 'predict.census_scatter:summary.income_bands.0.median_robberies'))
    expect(t).toContain(numberText(results, 'predict.census_scatter:summary.top_decile.median_income'))
    expect(t).toContain(data.summary.max.name)
    expect(t).toMatch(/not risk/)
  })
})
