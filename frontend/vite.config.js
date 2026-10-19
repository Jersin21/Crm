import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  appType: 'spa',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    minify: 'esbuild',
    target: 'es2015',
    cssMinify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@react-pdf') || id.includes('pdfkit') || id.includes('fontkit')) {
              return 'vendor-pdf';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('styled-components') || id.includes('react-toastify')) {
              return 'vendor-ui';
            }
            if (id.includes('@tanstack') || id.includes('axios')) {
              return 'vendor-utils';
            }
          }
        },
      },
    },
  },
});
