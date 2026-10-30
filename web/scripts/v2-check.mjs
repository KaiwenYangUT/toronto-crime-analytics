// Auto theft and break and enter load only when switched on, and the totals wait for them.
import { chromium } from '@playwright/test'

const base = process.env.BASE ?? 'http://localhost:4173/toronto-crime-analytics'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const requests = []
page.on('request', (r) => /v2/.test(r.url()) && requests.push(r.url().split('/').pop()))
await page.goto(`${base}/explore/`, { waitUntil: 'networkidle' })
console.log('v2 requested before switching on:', requests.length)
const read = async () => (await page.locator('[aria-live=polite]').first().innerText()).split('\n').slice(0, 3).join(' ')
console.log('default:', await read())
await page.getByRole('checkbox', { name: 'Auto theft' }).click()
await page.waitForFunction(() => document.querySelector('[aria-live=polite]')?.textContent?.includes('records'), null, { timeout: 15000 })
await page.waitForTimeout(800)
console.log('with auto theft:', await read(), '| requests:', requests.join(','))
await page.getByRole('checkbox', { name: 'Break and enter' }).click()
await page.waitForTimeout(800)
console.log('plus break and enter:', await read())
console.log('url:', page.url().split('?')[1])
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
