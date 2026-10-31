// Writes the paper's Vega-Lite specs (web/src/lib/paperSpecs.ts) as JSON for tools/gen_paper.py to render.
// Run from web/: node scripts/export-paper-specs.mjs <out-dir>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PAPER_FIGURES } from '../src/lib/paperSpecs.ts'

const out = process.argv[2]
if (!out) throw new Error('usage: export-paper-specs.mjs <out-dir>')
const page = (name) => JSON.parse(readFileSync(new URL(`../src/data/pages/${name}.json`, import.meta.url), 'utf8'))
const data = { fig1: page('explain'), fig2: page('explain'), fig3: page('predict'), fig4: page('predict') }
mkdirSync(out, { recursive: true })
for (const [name, build] of Object.entries(PAPER_FIGURES)) {
  writeFileSync(join(out, `${name}.vl.json`), JSON.stringify(build(data[name]), null, 1) + '\n')
  console.log('wrote', name)
}
