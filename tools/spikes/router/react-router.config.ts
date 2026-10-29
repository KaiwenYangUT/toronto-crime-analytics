import type { Config } from '@react-router/dev/config'

export default {
  basename: '/toronto-crime-analytics',
  // Retain the generated server bundle; only client/ is used by the static-host probe.
  ssr: true,
  routeDiscovery: { mode: 'initial' },
  prerender: ['/', '/explore'],
  buildDirectory: 'build',
} satisfies Config
