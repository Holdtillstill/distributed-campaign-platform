import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            },
            {
              name: 'charts-vendor',
              test: /[\\/]node_modules[\\/](recharts|d3-|victory-vendor)[\\/]/,
            },
            {
              name: 'icons-vendor',
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            },
            {
              name: 'redesign-v2',
              test: /[\\/]src[\\/]redesign-v2[\\/]/,
            },
            {
              name: 'redesign-v1',
              test: /[\\/]src[\\/]redesign[\\/]/,
            },
            {
              name: 'design-explorations',
              test: /[\\/]src[\\/]pages[\\/](AppDesignExplorations|DesignExplorations)[.]/,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
