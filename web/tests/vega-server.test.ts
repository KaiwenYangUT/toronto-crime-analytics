import { describe, expect, it } from 'vitest'
import { NARROW_WIDTH, one, renderSvgs } from '../src/lib/vegaServer.ts'

const spec = {
  data: { values: [{ k: 'a', v: 1 }, { k: 'b', v: 3 }] },
  mark: 'bar',
  encoding: { x: { field: 'k', type: 'nominal' }, y: { field: 'v', type: 'quantitative' } },
  height: 120,
}
const widthOf = (svg: string) => Number(/<svg[^>]*\swidth="([\d.]+)"/.exec(svg)?.[1])

describe('prerendered chart SVGs', () => {
  it('renders the wide pair by default and no narrow variants', async () => {
    const svgs = await renderSvgs(spec)
    expect(svgs.light).toContain('<svg')
    expect(svgs.dark).toContain('<svg')
    expect(svgs.lightNarrow).toBeUndefined()
    expect(svgs.darkNarrow).toBeUndefined()
  })
  it('adds 360 px variants for a main chart only when asked', async () => {
    const svgs = await renderSvgs(spec, { narrow: true })
    expect(svgs.lightNarrow).toBeDefined()
    expect(svgs.darkNarrow).toBeDefined()
    expect(widthOf(svgs.lightNarrow!)).toBeLessThan(widthOf(svgs.light))
    expect(widthOf(svgs.lightNarrow!)).toBeGreaterThanOrEqual(NARROW_WIDTH)
  })
  it('lets a spec keep its own width unless one is passed', async () => {
    const own = await one({ ...spec, width: 200 }, 'light')
    const forced = await one({ ...spec, width: 200 }, 'light', NARROW_WIDTH)
    expect(widthOf(own)).toBeLessThan(widthOf(forced))
  })
})
