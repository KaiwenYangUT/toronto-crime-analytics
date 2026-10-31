// R3b measurements: fold position of the first chart body, aside versus figure height per ResultSection,
// table readability (clipped columns) at 375x812 and 1280x800, plus screenshots to reviews/shots/r3b/.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.env.BASE ?? 'http://localhost:4173/toronto-crime-analytics'
const out = new URL('../../reviews/shots/r3b/', import.meta.url).pathname
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const shots = process.env.NOSHOTS ? [] : [['explore', 375, 812], ['explore', 1280, 800], ['explore', 1440, 900], ['explain', 375, 812], ['explain', 1280, 800], ['explain', 1440, 900], ['predict', 375, 812], ['predict', 1280, 800], ['predict', 1440, 900]]
const measure = [['explain', 375, 812], ['explain', 1280, 800], ['predict', 375, 812], ['predict', 1280, 800]]

async function open(route, w, h, scheme) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme })
  const page = await ctx.newPage()
  await page.goto(`${base}/${route}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(route === 'explore' ? 2500 : 1500)
  return { ctx, page }
}

for (const [route, w, h] of measure) {
  const { ctx, page } = await open(route, w, h, 'light')
  const m = await page.evaluate(() => {
    const body = document.querySelector('main section figure [class*="figureBody"]')
    const r = body?.getBoundingClientRect()
    const sections = [...document.querySelectorAll('main section[aria-labelledby]')].map((s) => {
      const fig = s.querySelector('[class*="resultFigure"]')
      const below = s.querySelector('[class*="resultBelow"]')
      const aside = s.querySelector('aside')
      const f = fig?.getBoundingClientRect().height ?? 0
      const b = below?.getBoundingClientRect().height ?? 0
      const a = aside?.getBoundingClientRect().height ?? 0
      return { id: s.id, figure: Math.round(f), below: Math.round(b), aside: Math.round(a), leftCol: Math.round(f + b), emptyUnderLeft: Math.round(a - f - b), h2Lines: Math.round(s.querySelector('h2').getBoundingClientRect().height / parseFloat(getComputedStyle(s.querySelector('h2')).lineHeight)) }
    })
    const tables = [...document.querySelectorAll('main [role="region"][class*="tableWrap"]')].map((t) => ({ label: t.getAttribute('aria-label')?.slice(0, 40), clipped: t.scrollWidth - t.clientWidth, w: Math.round(t.getBoundingClientRect().width) }))
    const h1 = document.querySelector('h1').getBoundingClientRect()
    return { bodyTop: r && Math.round(r.top), bodyBottom: r && Math.round(r.bottom), h1Bottom: Math.round(h1.bottom), sections, tables }
  })
  console.log(`${route} ${w}x${h}: chart body top ${m.bodyTop} (fold ${h}), bottom ${m.bodyBottom}, h1 bottom ${m.h1Bottom}`)
  for (const s of m.sections) console.log(`   ${s.id.padEnd(11)} figure ${s.figure} below ${s.below} aside ${s.aside}  empty under left column ${s.emptyUnderLeft}  h2 lines ${s.h2Lines}`)
  for (const t of m.tables) console.log(`   table "${t.label}" width ${t.w} clipped ${t.clipped}`)
  await ctx.close()
}
for (const scheme of ['light', 'dark']) {
  for (const [route, w, h] of shots) {
    const { ctx, page } = await open(route, w, h, scheme)
    await page.screenshot({ path: `${out}${route}-${w}-${scheme}.png` })
    if (route !== 'explore') await page.screenshot({ path: `${out}${route}-${w}-${scheme}-full.png`, fullPage: true })
    await ctx.close()
  }
}
await browser.close()
