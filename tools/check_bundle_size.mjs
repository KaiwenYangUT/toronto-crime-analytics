// Enforces the web budgets of PLAN.md section 3.3 (gzip sizes) against web/build/client and the data files.
// Usage: node tools/check_bundle_size.mjs   (after `npm run build` in web/)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const web = 'web'
const KB = 1024
const MB = KB * KB
// plotly.js-gl3d-dist-min 4.2.0 measured 530,168 bytes gzip (level 9) in its own chunk; budget = measured + 5%.
const PLOTLY_BUDGET = Math.ceil(530168 * 1.05)
// P10 split accounting (approved 2026-10-31): shared entry chunks stay at 180 KB gzip, each route chunk gets its own 40 KB.
const ROUTE_CHUNK = /^(about|explain|explore|methods|overview|paper|predict)-[\w-]+\.js$/
const ROUTE_BUDGET = 40 * KB
const rows = []
const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length
const check = (name, size, budget) => rows.push({ name, size, budget, ok: size <= budget })

const assets = join(web, 'build/client/assets')
if (!existsSync(assets)) throw new Error('Run `npm run build` in web/ first')
let core = 0
const routes = []
let vega = 0
let maplibre = 0
let plotly = 0
for (const f of readdirSync(assets).filter((x) => x.endsWith('.js'))) {
  const size = gz(join(assets, f))
  if (/^maplibre-gl/.test(f)) maplibre += size
  else if (/^plotly/.test(f)) plotly += size // the lazy 3D census scatter on Explain; never in core
  else if (/^embed/.test(f)) vega += size
  else if (ROUTE_CHUNK.test(f)) routes.push({ f, size })
  else core += size
}
check('JS shared core (excl. route chunks)', core, 180 * KB)
for (const r of routes.sort((a, b) => a.f.localeCompare(b.f))) check(`Route chunk ${r.f.replace(/-[\w-]+\.js$/, '')}`, r.size, ROUTE_BUDGET)
check('Vega chunk', vega, 300 * KB)
check('MapLibre chunk', maplibre, 260 * KB)
// P10 3D exception: own lazy chunk, loaded on Explain only.
// A missing chunk is a failure too: it would mean the 3D view was dropped or merged into a core chunk.
check('Plotly gl3d chunk (lazy, Explain only)', plotly, PLOTLY_BUDGET)
if (plotly === 0) rows[rows.length - 1].ok = false

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
