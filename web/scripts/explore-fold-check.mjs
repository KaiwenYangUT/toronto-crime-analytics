// P10 "Explore fold" check (PLAN.md section 9), run against the packaged site (npm run serve):
//  - 1280x800 and 1440x900: the page does not scroll past the footer, and the map, the trend and the bars are visible
//    (grid at least 592 px: the header spacing now follows PageHeader's stack, 8 px gaps, which cost 8 px of the old 600)
//  - 375x812: the map's top is above the fold
//  - 1024x768: the Filters button opens a drawer, Escape closes it and focus returns to the button
//  - brush on the trend: the chart is not re-drawn mid-drag, the dates reach the URL, and the URL reloads to the same range
import { chromium } from '@playwright/test'

const base = process.env.BASE ?? 'http://localhost:4173/toronto-crime-analytics'
const browser = await chromium.launch()
let failures = 0
const check = (ok, what, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? `  (${detail})` : ''}`)
}

async function open(width, height, scheme = 'light', path = '') {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`${base}/explore/${path}`, { waitUntil: 'networkidle' })
  // wait for the records total and for the interactive charts
  await page.waitForFunction(() => /records/.test(document.querySelector('[aria-live=polite]')?.textContent ?? '') && document.querySelectorAll('#trend svg.marks').length > 0, null, { timeout: 20000 })
  await page.waitForTimeout(500)
  return { ctx, page, errors }
}

const inView = (box, w, h) => box && box.width > 0 && box.height > 0 && box.x >= -1 && box.y >= -1 && box.x + box.width <= w + 1 && box.y + box.height <= h + 1

for (const [w, h] of [[1280, 800], [1440, 900]]) {
  const { ctx, page, errors } = await open(w, h)
  const m = await page.evaluate(() => ({ scroll: document.scrollingElement.scrollHeight, inner: innerHeight, footer: document.querySelector('footer').getBoundingClientRect().height }))
  check(m.scroll <= m.inner + Math.ceil(m.footer), `${w}x${h} page scrolls only through the footer`, `scrollHeight ${m.scroll}, innerHeight ${m.inner}, footer ${m.footer.toFixed(1)}`)
  for (const [name, sel] of [['map', '[aria-label^="Map of"]'], ['trend', '#trend'], ['bars (crime type)', '#by-category'], ['weekday/hour', '#by-when']]) {
    const box = await page.locator(sel).first().boundingBox()
    check(inView(box, w, h), `${w}x${h} ${name} visible in the first screen`, box ? `${Math.round(box.y)}..${Math.round(box.y + box.height)}` : 'missing')
  }
  const col = await page.evaluate(() => {
    const c = document.querySelector('#trend').parentElement
    return { client: c.clientHeight, scroll: c.scrollHeight }
  })
  check(col.scroll <= col.client + 1, `${w}x${h} charts column needs no scrollbar`, `${col.scroll} in ${col.client}`)
  const dash = await page.locator('#trend').first().evaluate((el) => el.parentElement.getBoundingClientRect().height)
  check(dash >= 592 - 1, `${w}x${h} grid is at least 592 px high`, `${Math.round(dash)}`)
  check(errors.length === 0, `${w}x${h} no console errors`, errors.join(' | '))
  await ctx.close()
}

{
  const { ctx, page, errors } = await open(375, 812)
  const box = await page.locator('[aria-label^="Map of"]').first().boundingBox()
  check(box && box.y < 812 - 100, '375x812 the map top is above the fold with room to see it', box ? `top ${Math.round(box.y)}` : 'missing')
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  check(over <= 0, '375x812 no horizontal overflow', `${over}`)
  check(errors.length === 0, '375x812 no console errors', errors.join(' | '))
  await ctx.close()
}

{
  const { ctx, page } = await open(1024, 768)
  const button = page.getByRole('button', { name: /^Filters/ })
  check(await button.isVisible(), '1024x768 Filters button is shown')
  check(!(await page.getByRole('dialog', { name: 'Filters' }).count()), '1024x768 the drawer is closed at first')
  await button.click()
  const dialog = page.getByRole('dialog', { name: 'Filters' })
  await dialog.waitFor({ state: 'visible' })
  const box = await dialog.boundingBox()
  check(box && box.x === 0 && box.width <= 360 && box.height >= 700, '1024x768 the drawer opens as a left side panel', box ? `${Math.round(box.width)} x ${Math.round(box.height)}` : '')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  check((await dialog.count()) === 0, '1024x768 Escape closes the drawer')
  check(await page.evaluate(() => document.activeElement?.textContent?.startsWith('Filters')), '1024x768 focus returns to the Filters button')
  await ctx.close()
}

{
  const { ctx, page } = await open(1280, 800)
  const totals = async () => (await page.locator('[aria-live=polite]').first().innerText()).split('\n')[0]
  const before = await totals()
  // mark the live chart's SVG: if the chart were re-embedded mid-drag, the mark would vanish
  const box = await page.locator('#trend svg.marks').first().boundingBox()
  await page.locator('#trend svg.marks').first().evaluate((el) => el.setAttribute('data-probe', '1'))
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width * 0.35, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.5, y, { steps: 8 })
  await page.waitForTimeout(700)
  await page.mouse.move(box.x + box.width * 0.7, y, { steps: 8 })
  await page.waitForTimeout(700)
  check((await page.locator('#trend svg[data-probe="1"]').count()) === 1, 'brush: the trend is not re-drawn while dragging')
  check(!/[?&]from=/.test(page.url()), 'brush: nothing is written to the URL while dragging', page.url().split('?')[1] ?? '')
  await page.mouse.up()
  await page.waitForFunction(() => /from=/.test(location.search), null, { timeout: 5000 })
  await page.waitForTimeout(800)
  const url = new URL(page.url())
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  check(Boolean(from && to && from < to), 'brush: from and to reach the URL', `${from} to ${to}`)
  const after = await totals()
  check(after !== before, 'brush: the totals change with the dates', `${before} -> ${after}`)
  const inputs = page.locator('input[type=date]')
  check((await inputs.nth(0).inputValue()) === from && (await inputs.nth(1).inputValue()) === to, 'brush: the date fields show the same dates')
  check(await page.locator('#trend').getByText(`Dates: ${from} to ${to}`).count() === 1, 'brush: the trend notes the applied dates')
  // round trip
  await page.goto(page.url(), { waitUntil: 'networkidle' })
  await page.waitForFunction(() => /records/.test(document.querySelector('[aria-live=polite]')?.textContent ?? ''), null, { timeout: 20000 })
  await page.waitForTimeout(800)
  check((await totals()) === after, 'url round trip: a reload gives the same totals', await totals())
  check((await inputs.nth(0).inputValue()) === from && (await inputs.nth(1).inputValue()) === to, 'url round trip: the date fields hold the same dates')
  // the date fields are the keyboard alternative
  await inputs.nth(0).focus()
  check(await page.evaluate(() => document.activeElement?.getAttribute('type') === 'date'), 'date fields take keyboard focus')
  await ctx.close()
}

{
  // keyboard alternative to the brush: typing a date digit by digit must land on the typed date
  const { ctx, page } = await open(1280, 800)
  const from = page.locator('input[type=date]').first()
  // the field is year-first in this locale (shown as 2020-01-01); a click at the left edge lands on its first segment
  await from.click({ position: { x: 14, y: 20 } })
  await page.keyboard.type('20210315')
  await page.waitForTimeout(800)
  check(new URL(page.url()).searchParams.get('from') === '2021-03-15', 'keyboard: typing a From date applies it', page.url().split('?')[1] ?? '')
  check((await from.inputValue()) === '2021-03-15', 'keyboard: the field keeps the typed date', await from.inputValue())
  await ctx.close()
}

await browser.close()
console.log(failures ? `${failures} check(s) failed` : 'explore fold check: all pass')
process.exit(failures ? 1 : 0)
