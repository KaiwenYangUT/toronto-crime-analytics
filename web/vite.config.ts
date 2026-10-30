import { execSync } from 'node:child_process'
import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'

function buildSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  base: '/toronto-crime-analytics/',
  define: { __BUILD_SHA__: JSON.stringify(buildSha()) },
  server: { fs: { allow: ['..'] } },
  plugins: [reactRouter()],
})
