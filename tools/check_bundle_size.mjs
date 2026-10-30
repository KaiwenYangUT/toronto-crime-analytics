// Enforces the web budgets of PLAN.md section 3.3 (gzip sizes) against web/build/client and the data files.
// Usage: node tools/check_bundle_size.mjs   (after `npm run build` in web/)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const web = 'web'
const KB = 1024
const MB = KB * KB
const rows = []
const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length
const check = (name, size, budget) => rows.push({ name, size, budget, ok: size <= budget })

const assets = join(web, 'build/client/assets')
if (!existsSync(assets)) throw new Error('Run `npm run build` in web/ first')
let core = 0
let vega = 0
let maplibre = 0
for (const f of readdirSync(assets).filter((x) => x.endsWith('.js'))) {
  const size = gz(join(assets, f))
  if (/^maplibre-gl/.test(f)) maplibre += size
  else if (/^embed/.test(f)) vega += size
  else core += size
}
check('JS core (all other chunks)', core, 180 * KB)
check('Vega chunk', vega, 300 * KB)
check('MapLibre chunk', maplibre, 260 * KB)

const fonts = readdirSync(join(web, 'public/fonts')).reduce((n, f) => n + statSync(join(web, 'public/fonts', f)).size, 0)
check('Fonts (woff2)', fonts, 150 * KB)
for (const [name, budget] of [['legacy.bin', 0.6 * MB], ['v2.bin', 2.0 * MB]]) {
  const f = join(web, 'public/data/explore', name)
  if (existsSync(f)) check(`explore/${name} (gzip)`, gz(f), budget)
}
for (const f of readdirSync(join(web, 'src/data/pages'))) check(`results ${f} (gzip)`, gz(join(web, 'src/data/pages', f)), 150 * KB)
const basemap = join(web, 'public/basemap/toronto.pmtiles')
if (existsSync(basemap)) check('Basemap file', statSync(basemap).size, 45 * MB)
const paper = join(web, 'public/paper/paper.pdf')
if (existsSync(paper)) check('paper.pdf', statSync(paper).size, 3 * MB)

let bad = 0
for (const r of rows) {
  const flag = r.ok ? 'ok  ' : 'FAIL'
  if (!r.ok) bad++
  console.log(`${flag} ${r.name.padEnd(34)} ${(r.size / KB).toFixed(1).padStart(9)} KB  (budget ${(r.budget / KB).toFixed(0)} KB)`)
}
process.exit(bad ? 1 : 0)
