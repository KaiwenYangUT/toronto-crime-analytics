// Design-review screenshots: node scripts/shots.mjs <route,route> [widths] [schemes] [fullpage]
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const routes = (process.argv[2] ?? '').split(',').filter(Boolean).map((r) => (r === 'home' ? '' : r))
const widths = (process.argv[3] ?? '1280').split(',').map(Number)
const schemes = (process.argv[4] ?? 'light').split(',')
const full = process.argv[5] !== 'fold'
const base = process.env.BASE ?? 'http://localhost:4173/toronto-crime-analytics'
const out = process.env.OUT ?? '../build/shots'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
for (const scheme of schemes) {
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 812 : 800 }, colorScheme: scheme })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    for (const r of routes) {
      await page.goto(`${base}/${r}${r ? '/' : ''}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)
      const name = `${r || 'overview'}-${w}-${scheme}${full ? '' : '-fold'}`
      await page.screenshot({ path: `${out}/${name}.png`, fullPage: full })
      console.log(name, errors.length ? `ERRORS: ${errors.join(' | ')}` : 'ok')
      errors.length = 0
    }
    await ctx.close()
  }
}
await browser.close()
