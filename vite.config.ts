import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5177,
    strictPort: true,
    allowedHosts: ['open-claw-vnic.tail6e7851.ts.net'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
