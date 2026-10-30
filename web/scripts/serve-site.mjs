// Static preview of web/site/ under the /toronto-crime-analytics/ base path (no rewrites, like Pages).
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const root = join(process.cwd(), 'site')
const base = '/toronto-crime-analytics'
const port = Number(process.env.PORT ?? 4173)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.bin': 'application/octet-stream', '.data': 'text/x-script', '.pdf': 'application/pdf', '.pmtiles': 'application/octet-stream' }

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  if (!url.pathname.startsWith(base)) {
    res.writeHead(404).end('not found')
    return
  }
  let file = normalize(join(root, decodeURIComponent(url.pathname.slice(base.length))))
  if (!file.startsWith(root)) {
    res.writeHead(403).end()
    return
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) {
    res.writeHead(404, { 'content-type': types['.html'] })
    createReadStream(join(root, '404.html')).pipe(res)
    return
  }
  const size = statSync(file).size
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '')
  const headers = { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'accept-ranges': 'bytes' }
  if (range) {
    const start = range[1] ? Number(range[1]) : 0
    const end = range[2] ? Number(range[2]) : size - 1
    res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 })
    createReadStream(file, { start, end }).pipe(res)
  } else {
    res.writeHead(200, { ...headers, 'content-length': size })
    createReadStream(file).pipe(res)
  }
}).listen(port, () => console.log(`http://localhost:${port}${base}/`))
