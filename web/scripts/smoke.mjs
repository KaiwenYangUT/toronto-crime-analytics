// Playwright smoke test of every route at 375 / 768 / 1280 px in light and dark mode:
// no console or page errors, one H1, no horizontal overflow, and zero serious or critical axe issues.
import AxeBuilder from '@axe-core/playwright'
import { chromium } from '@playwright/test'

const base = process.env.BASE ?? 'http://localhost:4173/toronto-crime-analytics'
const routes = ['', 'explore', 'explain', 'predict', 'paper', 'methods', 'about']
const widths = [375, 768, 1280]
const schemes = ['light', 'dark']
const browser = await chromium.launch()
let failures = 0
for (const scheme of schemes) {
  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 812 : 800 }, colorScheme: scheme })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
    for (const r of routes) {
      errors.length = 0
      await page.goto(`${base}/${r}${r ? '/' : ''}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      const problems = [...errors]
      const h1 = await page.locator('h1').count()
      if (h1 !== 1) problems.push(`${h1} h1 elements`)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (overflow > 0) problems.push(`horizontal overflow ${overflow}px`)
      const axe = await new AxeBuilder({ page }).analyze()
      for (const v of axe.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical')) {
        problems.push(`axe ${v.impact}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target?.join(' ')}`)
      }
      const tag = `${(r || 'overview').padEnd(8)} ${String(width).padStart(4)} ${scheme.padEnd(5)}`
      if (problems.length) {
        failures++
        console.log(`FAIL ${tag}\n  ${problems.join('\n  ')}`)
      } else console.log(`ok   ${tag}`)
    }
    await ctx.close()
  }
}
await browser.close()
console.log(failures ? `${failures} failing combination(s)` : 'smoke: all combinations pass')
process.exit(failures ? 1 : 0)
