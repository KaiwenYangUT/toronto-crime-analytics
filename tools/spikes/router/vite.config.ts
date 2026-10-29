import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/toronto-crime-analytics/',
  build: { emptyOutDir: false },
  plugins: [reactRouter()],
})
