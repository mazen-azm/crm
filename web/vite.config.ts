import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The browser talks to /api/v1 and nothing else; in development the proxy
// points that at the API's own port (api/src/server.js defaults to 3000).
// There is no server-side data path here on purpose — see docs/architecture.md.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/testing/setup.ts'],
    globals: true,
  },
});
