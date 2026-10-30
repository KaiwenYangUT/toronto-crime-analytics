import { defineConfig } from 'vitest/config'

// Tests run without the React Router plugin; they exercise plain TypeScript modules.
export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } })
