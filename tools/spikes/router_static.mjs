import assert from 'node:assert/strict'
import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve } from 'node:path'
import { chromium } from '../../web/node_modules/@playwright/test/index.mjs'

const prefix = '/toronto-crime-analytics/'
const client = resolve('tools/spikes/router/build/client')
const output = resolve('build/spikes/router-static')
await mkdir(output, { recursive: true })
// RR7 emits prefixed HTML but unprefixed assets. Package both at the Pages artifact root.
await cp(resolve(client, 'assets'), resolve(output, 'assets'), { recursive: true })
await cp(resolve(client, prefix.slice(1)), output, { recursive: true })
const requests = []
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4175')
  try {
    assert.ok(url.pathname.startsWith(prefix))
    let path = resolve(output, '.' + decodeURIComponent(url.pathname.slice(prefix.length - 1)))
    assert.ok(path.startsWith(output + '/') || path === output)
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html')
    const bytes = await readFile(path)
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
    response.writeHead(200, { 'Content-Type': type[extname(path)] ?? 'application/octet-stream' })
    response.end(bytes)
    requests.push({ path: url.pathname, status: 200, bytes: bytes.length })
  } catch {
    response.writeHead(404)
    response.end('Not found')
    requests.push({ path: url.pathname, status: 404 })
  }
})
await new Promise(listen => server.listen(4175, '127.0.0.1', listen))
let browser
try {
  browser = await chromium.launch({ headless: true })
  const noJs = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await noJs.newPage()
  const base = 'http://127.0.0.1:4175' + prefix
  assert.equal((await staticPage.goto(base)).status(), 200)
  assert.equal(await staticPage.locator('h1').innerText(), 'Static prerender probe')
  assert.equal((await staticPage.goto(base + 'explore/')).status(), 200)
  assert.equal(await staticPage.locator('h1').innerText(), 'Nested route prerender probe')
  await noJs.close()
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Explore probe' }).click()
  await page.waitForURL(base + 'explore')
  assert.equal(await page.locator('h1').innerText(), 'Nested route prerender probe')
  assert.equal((await page.reload({ waitUntil: 'networkidle' })).status(), 200)
  assert.equal(await page.locator('h1').innerText(), 'Nested route prerender probe')
  assert.deepEqual(errors, [])
  assert.ok(requests.every(request => request.status === 200))
  const result = {
    reactRouter: '7.18.5', basePath: prefix,
    prerenderedRoutes: ['/', '/explore'], javascriptDisabled: 'both routes render H1',
    navigation: 'hydrated link and nested hard refresh pass', pageErrors: errors, requests,
    packaging: 'Copy client/assets plus contents of client/toronto-crime-analytics into artifact root.',
    scope: 'Static file server only; generated server bundle retained and unused, no deployment.',
  }
  await writeFile('parity/spikes/router-static.json', JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
} finally {
  if (browser) await browser.close()
  server.closeAllConnections()
  await new Promise(close => server.close(close))
}
