import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Single-file packaging inlines the built HTML manually (see the repo's
    // packaging script) — that only works cleanly against one JS chunk, so
    // code-splitting (which jsPDF's dependency graph would otherwise trigger)
    // is disabled here rather than teaching the packaging script to stitch
    // multiple chunks back together in the right order.
    rollupOptions: {
      output: {
        manualChunks: undefined,
        codeSplitting: false,
      },
    },
  },
})
