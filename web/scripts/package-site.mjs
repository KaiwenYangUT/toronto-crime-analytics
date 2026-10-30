// Turns React Router's prerendered output into the GitHub Pages artifact root (web/site/):
// the HTML under the base-path folder plus assets, data and fonts, and 404.html from the SPA fallback.
import { cpSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const client = 'build/client'
const base = join(client, 'toronto-crime-analytics')
const out = 'site'
if (!existsSync(base)) throw new Error('Run `npm run build` first')
mkdirSync(out, { recursive: true })
cpSync(base, out, { recursive: true, force: true })
for (const name of readdirSync(client)) {
  if (name === 'toronto-crime-analytics' || name === '__spa-fallback.html') continue
  cpSync(join(client, name), join(out, name), { recursive: true, force: true })
}
copyFileSync(join(client, '__spa-fallback.html'), join(out, '404.html'))
console.log('packaged site/')
