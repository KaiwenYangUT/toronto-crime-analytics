import type { Config } from '@react-router/dev/config'

// Every route is prerendered, so each page is static HTML on GitHub Pages and deep links work.
export default {
  appDirectory: 'src',
  basename: '/toronto-crime-analytics',
  ssr: false,
  routeDiscovery: { mode: 'initial' },
  prerender: ['/', '/explore', '/explain', '/predict', '/paper', '/methods', '/about'],
  buildDirectory: 'build',
} satisfies Config
