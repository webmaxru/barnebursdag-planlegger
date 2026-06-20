import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: Vite on 5173 proxies /api to the Express server on 8080.
// Prod: Express serves the built dist/ and the same /api routes.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8080' }
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false
  }
});
