import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(root, './src') } },
  test: {
    include: [
      'src/**/*.test.{ts,tsx}',
      'api/**/*.test.ts',
      'supabase/**/*.test.ts',
      'scripts/**/*.test.mjs',
    ],
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
    unstubGlobals: true,
    // Overrides .env.local so tests never reach real services.
    env: {
      VITE_USE_MOCKS: 'true',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
      ADMIN_JWT_SECRET: 'test-secret',
      // Keeps failures short: no DOM dump.
      DEBUG_PRINT_LIMIT: '0',
    },
  },
})
