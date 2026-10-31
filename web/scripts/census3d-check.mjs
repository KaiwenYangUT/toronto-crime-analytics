// Playwright check of the lazy three-dimensional census scatter on /explain/.
//   * the Plotly chunk is requested on /explain/ only (after opt-in or when the figure is in view), never elsewhere
//   * without WebGL, or with reduced motion, the flat SVG and the data table render and no Plotly chunk is requested
//   * rotate, reset, zoom, Show 2D and a live theme switch run with no console errors; print shows the flat view
//   * light and dark screenshots go to reviews/shots/gateB/
// Usage (site served at BASE): node web/scripts/census3d-check.mjs
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const base = process.env.BASE ?? 'http://localhost:4183/toronto-crime-analytics'
const page_ = process.env.PAGE ?? 'explain/' // the page that mounts <CensusScatter>
const shots = fileURLToPath(new URL('../../reviews/shots/gateB/', import.meta.url))
mkdirSync(shots, { recursive: true })
const SCENE = '[data-testid=census-scatter]'
const failures = []
const log = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`)
  if (!ok) failures.push(msg)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Opens a page that records console errors and Plotly chunk requests. */
async function open(browser, opts = {}, launchedWith = '') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts })
  const page = await ctx.newPage()
  const rec = { errors: [], plotly: [], launchedWith }
  page.on('pageerror', (e) => rec.errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && rec.errors.push(`console: ${m.text()}`))
  page.on('request', (r) => /\/plotly[^/]*\.js/.test(r.url()) && rec.plotly.push(r.url()))
  return { ctx, page, rec }
}

async function gotoExplain(page) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto(`${base}/${page_}`, { waitUntil: 'networkidle' })
    if (await page.locator(SCENE).count()) return true
    console.log('census-scatter not mounted on /explain/ yet; waiting 60 s before one retry')
    await sleep(60000)
  }
  return false
}

const eyeOf = (page) =>
  page.evaluate(() => {
    const gd = document.querySelector('[data-testid=census-stage] .js-plotly-plot')
    const e = gd?._fullLayout?.scene?.camera?.eye
    return e ? { x: e.x, y: e.y, z: e.z } : null
  })
const paperOf = (page) => page.evaluate(() => document.querySelector('[data-testid=census-stage] .js-plotly-plot')?._fullLayout?.paper_bgcolor)
const flatVisible = (page) =>
  page.evaluate((sel) => {
    const flat = [...document.querySelectorAll(`${sel} figure svg`)].filter((n) => !n.closest('[data-census-host]'))
    return flat.some((n) => n.getBoundingClientRect().width > 50 && getComputedStyle(n).visibility !== 'hidden')
  }, SCENE)

async function noPlotlyElsewhere(browser) {
  if (process.env.SKIP_ELSEWHERE) return
  for (const r of ['', 'explore', 'predict', 'methods', 'about', 'paper']) {
    const { ctx, page, rec } = await open(browser)
    await page.goto(`${base}/${r}${r ? '/' : ''}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.mouse.wheel(0, 4000)
    await page.waitForTimeout(800)
    log(rec.plotly.length === 0, `no Plotly chunk requested on /${r}`)
    await ctx.close()
  }
}

async function desktopFlow(browser) {
  const { ctx, page, rec } = await open(browser, { colorScheme: 'light' })
  if (!(await gotoExplain(page))) {
    log(false, 'CensusScatter is not mounted on /explain/ (R2b has not wired it); browser flow skipped')
    await ctx.close()
    return
  }
  await page.waitForTimeout(800)
  const box = await page.locator(SCENE).boundingBox()
  const inView = box && box.y < 800
  if (!inView) log(rec.plotly.length === 0, 'desktop: no Plotly chunk before the figure scrolls into view')
  log(await flatVisible(page), 'desktop: flat SVG is the first paint')
  await page.locator(SCENE).scrollIntoViewIfNeeded()
  await page.waitForTimeout(3000)
  log(rec.plotly.length >= 1, 'desktop: chunk prefetched once the figure is in view (wide screen, mouse)')

  const open3d = page.getByRole('button', { name: 'Rotate in three dimensions' })
  log(await open3d.isVisible(), 'desktop: "Rotate in three dimensions" button is offered')
  await open3d.click()
  await page.waitForSelector('[data-testid=census-stage] canvas', { timeout: 20000 })
  log(true, 'desktop: three-dimensional canvas mounted')
  log(!(await flatVisible(page)), 'desktop: 3D replaced the flat view in place')
  const stageLocked = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid=census-stage]')).pointerEvents)
  log(stageLocked !== 'none', 'desktop: canvas is interactive without an Interact gate')
  await page.waitForTimeout(1200)
  const sizes = await page.$$eval(`${SCENE} button`, (bs) => bs.map((b) => [b.getAttribute('aria-label') ?? b.textContent, b.getBoundingClientRect().height, b.getBoundingClientRect().width]))
  const small = sizes.filter(([, h, w]) => h < 43.5 || w < 43.5)
  log(small.length === 0, `desktop: every button is at least 44 px (${small.map((s) => s[0]).join(', ') || 'all'})`)
  for (const name of ['Reset view', 'Rotate left', 'Rotate right', 'Zoom in', 'Zoom out', 'Show 2D']) {
    log((await page.getByRole('button', { name, exact: true }).count()) === 1, `desktop: control "${name}" present with its label`)
  }
  await page.locator('[data-testid=census-stage]').screenshot({ path: `${shots}census-3d-light.png` })

  const e0 = await eyeOf(page)
  await page.getByRole('button', { name: 'Rotate left', exact: true }).click()
  await page.waitForTimeout(500)
  const e1 = await eyeOf(page)
  await page.getByRole('button', { name: 'Rotate right', exact: true }).click()
  await page.getByRole('button', { name: 'Rotate right', exact: true }).click()
  await page.waitForTimeout(500)
  const e2 = await eyeOf(page)
  log(e0 && e1 && Math.abs(e1.x - e0.x) > 0.05 && Math.abs(e1.z - e0.z) < 1e-6, 'desktop: Rotate left turns the camera about z')
  log(e1 && e2 && Math.abs(e2.x - e1.x) > 0.05, 'desktop: Rotate right turns it the other way')
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.waitForTimeout(400)
  const e3 = await eyeOf(page)
  log(e3 && Math.hypot(e3.x, e3.y, e3.z) < Math.hypot(e2.x, e2.y, e2.z), 'desktop: Zoom in moves the camera closer')
  await page.getByRole('button', { name: 'Reset view', exact: true }).click()
  await page.waitForTimeout(500)
  const e4 = await eyeOf(page)
  log(e4 && Math.abs(e4.x - 1.6) < 1e-6 && Math.abs(e4.y - 1.6) < 1e-6 && Math.abs(e4.z - 0.9) < 1e-6, 'desktop: Reset view restores the default camera')

  // live theme switches: the data-theme attribute and the OS preference
  const lightBg = await paperOf(page)
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'))
  await page.waitForTimeout(1200)
  const darkBg = await paperOf(page)
  log(lightBg && darkBg && lightBg !== darkBg, `desktop: scene follows data-theme live (${lightBg} -> ${darkBg})`)
  await page.locator('[data-testid=census-stage]').screenshot({ path: `${shots}census-3d-dark.png` })
  await page.evaluate(() => (document.documentElement.dataset.theme = 'light'))
  await page.waitForTimeout(1200)
  log((await paperOf(page)) === lightBg, 'desktop: and back to light')
  await page.evaluate(() => delete document.documentElement.dataset.theme)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForTimeout(1200)
  log((await paperOf(page)) === darkBg, 'desktop: scene follows the OS colour scheme live')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForTimeout(800)

  await page.emulateMedia({ media: 'print' })
  log(await flatVisible(page), 'print: the flat view is shown while 3D is open')
  log(await page.evaluate(() => [...document.querySelectorAll('[data-testid=census-stage]')].every((n) => n.getBoundingClientRect().height === 0)), 'print: the 3D stage is hidden')
  await page.emulateMedia({ media: 'screen' })

  await page.getByRole('button', { name: 'Show 2D', exact: true }).click()
  await page.waitForTimeout(800)
  const flatWidth = await page.evaluate((sel) => Math.max(...[...document.querySelectorAll(`${sel} figure svg`)].map((n) => n.getBoundingClientRect().width)), SCENE)
  log(flatWidth > 300, `desktop: the flat chart kept its width through a theme switch while hidden (${Math.round(flatWidth)} px)`)
  log((await page.locator('[data-testid=census-stage]').count()) === 0 && (await flatVisible(page)), 'desktop: Show 2D returns to the flat view')
  await page.locator(SCENE).getByRole('button', { name: /^Data/ }).click()
  await page.getByRole('button', { name: 'View data table' }).click()
  log((await page.locator(`${SCENE} table tbody tr`).count()) > 100, 'desktop: data table lists the neighbourhoods')
  log(rec.errors.length === 0, `desktop: no console errors${rec.errors.length ? ' - ' + rec.errors.join(' | ') : ''}`)
  await ctx.close()
}


async function mobileFlow(browser) {
  const { ctx, page, rec } = await open(browser, { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, colorScheme: 'light' })
  if (!(await gotoExplain(page))) {
    log(false, 'CensusScatter is not mounted on /explain/; mobile flow skipped')
    await ctx.close()
    return
  }
  await page.locator(SCENE).scrollIntoViewIfNeeded()
  await page.waitForTimeout(2500)
  log(rec.plotly.length === 0, 'mobile: no Plotly chunk before the reader opts in')
  await page.getByRole('button', { name: 'Rotate in three dimensions' }).tap()
  await page.waitForSelector('[data-testid=census-stage] canvas', { timeout: 20000 })
  log(rec.plotly.length >= 1, 'mobile: chunk requested after the opt-in click')
  const pe = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-testid=census-stage]')).pointerEvents)
  log((await pe()) === 'none', 'mobile: canvas ignores touches until Interact')
  await page.getByRole('button', { name: 'Interact', exact: true }).tap()
  log((await pe()) !== 'none', 'mobile: Interact enables the canvas')
  await page.getByRole('button', { name: 'Done', exact: true }).tap()
  log((await pe()) === 'none', 'mobile: Done restores page scrolling')
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  log(over <= 0, `mobile: no horizontal overflow (${over}px)`)
  await page.locator('[data-testid=census-stage]').screenshot({ path: `${shots}census-3d-mobile.png` })
  log(rec.errors.length === 0, `mobile: no console errors${rec.errors.length ? ' - ' + rec.errors.join(' | ') : ''}`)
  await ctx.close()
}

/** Flat view only: the SVG and the table render and Plotly is never requested. */
async function flatOnly(browser, label, opts = {}) {
  const { ctx, page, rec } = await open(browser, opts)
  if (!(await gotoExplain(page))) {
    log(false, `CensusScatter is not mounted on /explain/; ${label} skipped`)
    await ctx.close()
    return
  }
  await page.locator(SCENE).scrollIntoViewIfNeeded()
  await page.waitForTimeout(3000)
  log(await flatVisible(page), `${label}: flat SVG renders`)
  log((await page.getByRole('button', { name: 'Rotate in three dimensions' }).count()) === 0, `${label}: no 3D button`)
  log((await page.locator(`${SCENE} p`, { hasText: /Rotation is off/ }).count()) === 1, `${label}: a note says why rotation is off`)
  await page.locator(SCENE).getByRole('button', { name: /^Data/ }).click()
  await page.getByRole('button', { name: 'View data table' }).click()
  log((await page.locator(`${SCENE} table tbody tr`).count()) > 100, `${label}: data table renders`)
  log(rec.plotly.length === 0, `${label}: no Plotly chunk requested`)
  log(rec.errors.length === 0, `${label}: no console errors${rec.errors.length ? ' - ' + rec.errors.join(' | ') : ''}`)
  await page.screenshot({ path: `${shots}census-flat-${label.replace(/\W+/g, '-')}.png`, clip: undefined, fullPage: false })
  await ctx.close()
}

const gl = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
const browser = await chromium.launch({ args: gl })
await noPlotlyElsewhere(browser)
await desktopFlow(browser)
await mobileFlow(browser)
await flatOnly(browser, 'reduced motion', { reducedMotion: 'reduce' })
await browser.close()
const noGl = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis', '--disable-gpu'] })
await flatOnly(noGl, 'no WebGL')
await noGl.close()
console.log(failures.length ? `census3d-check: ${failures.length} failure(s)` : 'census3d-check: all checks pass')
process.exit(failures.length ? 1 : 0)
