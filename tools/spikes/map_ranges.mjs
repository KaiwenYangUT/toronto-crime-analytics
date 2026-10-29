import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from '../../web/node_modules/vite/dist/node/index.js'
import { FetchSource, PMTiles } from '../../web/node_modules/pmtiles/dist/esm/index.js'

const root = resolve('.')
const archivePath = resolve('build/spikes/map/toronto-z14.pmtiles')
const bytes = await readFile(archivePath)
const requests = []
const originalFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const response = await originalFetch(input, init)
  requests.push({
    range: new Headers(init?.headers).get('Range'),
    status: response.status,
    contentRange: response.headers.get('Content-Range'),
    contentLength: response.headers.get('Content-Length'),
    contentEncoding: response.headers.get('Content-Encoding'),
  })
  return response
}
const server = await preview({
  root, configFile: false, base: '/toronto-crime-analytics/',
  build: { outDir: resolve('build/spikes/map') },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
})
try {
  const url = 'http://127.0.0.1:4174/toronto-crime-analytics/toronto-z14.pmtiles'
  const response = await fetch(url, { headers: { Range: 'bytes=127-254' } })
  assert.equal(response.status, 206)
  assert.equal(response.headers.get('Content-Range'), `bytes 127-254/${bytes.length}`)
  assert.equal(response.headers.get('Accept-Ranges'), 'bytes')
  assert.equal(response.headers.get('Content-Encoding'), null)
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(127, 255))
  const archive = new PMTiles(new FetchSource(url))
  const header = await archive.getHeader()
  assert.equal(header.maxZoom, 14)
  const zoom = 12
  const x = Math.floor((-79.38 + 180) / 360 * 2 ** zoom)
  const lat = 43.65 * Math.PI / 180
  const y = Math.floor((1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * 2 ** zoom)
  const tile = await archive.getZxy(zoom, x, y)
  assert.ok(tile && tile.data.byteLength > 0)
  assert.ok(requests.every(request => request.status === 206))
  const transferred = requests.reduce((sum, r) => sum + Number(r.contentLength), 0)
  assert.ok(transferred < 1_000_000)
  assert.ok(bytes.length <= 45_000_000)
  const result = {
    archive: { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') },
    header, requests, transferredBytes: transferred,
    decodedTile: { zoom, x, y, bytes: tile.data.byteLength },
    source: 'https://build.protomaps.com/20261029.pmtiles',
    bbox: [-79.64, 43.58, -79.12, 43.86],
    scope: 'Vite preview range and one tile probe; full MapLibre viewport budget remains P6.',
  }
  await writeFile('parity/spikes/map-ranges.json', JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
} finally {
  globalThis.fetch = originalFetch
  server.httpServer.closeAllConnections()
  await new Promise(resolveClose => server.httpServer.close(resolveClose))
}
