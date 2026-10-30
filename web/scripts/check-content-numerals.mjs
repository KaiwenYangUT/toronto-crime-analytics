// Lint: page copy in src/content may not contain literal numerals; numbers come through <Num k="…" />.
// Allowed: years, course codes, figure and rung labels, section references, and numbers inside Num/key strings.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'src/content'
const ALLOWED = [
  /\b(19|20)\d\d\b/g, // years
  /\b(JSC|STA)\d{3}\b/g, // course codes
  /\bL[0-5]\b/g, // ablation rungs
  /\bFigure \d\b/g, // course report figures
  /\b\d{1,2}:\d{2}\b/g, // clock times in labels
  /\bv\d\b/g,
  /\b95%/g, // the stated interval level
  /\bF1\b/g, // metric name
  /\b\d{1,2}(am|pm)\b/g, // clock labels
]
// Quoted strings that are references or style hooks, not copy.
const IGNORE_STRING = /^(var\(|--|\.\.|\/|#|[a-z]+[.:][\w.:*-]+$|[\w]+$)/
let bad = 0
for (const f of readdirSync(dir).filter((x) => x.endsWith('.tsx'))) {
  const text = readFileSync(join(dir, f), 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    let t = line
    if (/^\s*(import|const [A-Z]\w* = ['`]|\/\/)/.test(t)) return
    t = t.replace(/k=\{`[^`]*`\}|k="[^"]*"|k=\{[^}]*\}/g, '') // Num references
    t = t.replace(/`\$\{[^}]*\}[^`]*`/g, '') // template references
    t = t.replace(/\$\{[^}]*\}/g, '')
    t = t.replace(/(className|style|key|id|href|to|aria-[\w-]+|sourceKey|sources|minHeight|rowKey)=(\{[^}]*\}|"[^"]*"|'[^']*')/g, '')
    t = t.replace(/\b(var|rgb)\([^)]*\)/g, '')
    for (const re of ALLOWED) t = t.replace(re, '')
    t = t.replace(/(['"`])([^'"`]*)\1/g, (m, _q, body) => (IGNORE_STRING.test(body) || !/\d/.test(body) ? '' : m))
    const found = /\d/.exec(t.replace(/<[^>]*>/g, ' '))
    if (found && !/^\s*(\{|\}|\)|\]|,|;|\/)/.test(t.trim() || ' ')) {
      console.log(`${f}:${i + 1}: literal numeral in copy: ${line.trim().slice(0, 110)}`)
      bad++
    }
  })
}
if (bad) {
  console.error(`${bad} line(s) with literal numerals`)
  process.exit(1)
}
console.log('content numerals: ok')
