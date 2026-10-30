// Smoke test of Explore interactions: URL state, filter changes and the map in a local-radius view.
import { chromium } from '@playwright/test'

const base = process.env.BASE ?? 'http://localhost:4173/toronto-crime-analytics'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto(`${base}/explore/?mode=destination&place=site1&radius=300&cats=Robbery`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const totals = await page.locator('[aria-live=polite]').first().innerText()
console.log('totals:', totals.replace(/\n/g, ' | '))
await page.screenshot({ path: '../build/shots/explore-local.png' })
await page.getByLabel('Citywide').click()
await page.waitForTimeout(500)
console.log('url after citywide:', page.url())
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
