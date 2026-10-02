import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/xlsx/')) return 'spreadsheet'
          if (id.includes('/node_modules/recharts/')) return 'charts'
          if (id.includes('/node_modules/@firebase/firestore') || id.includes('/node_modules/firebase/firestore')) return 'firebase-firestore'
          if (id.includes('/node_modules/@firebase/auth') || id.includes('/node_modules/firebase/auth')) return 'firebase-auth'
          if (id.includes('/node_modules/@firebase/')) return 'firebase-core'
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'RepBook Workout Log',
        short_name: 'RepBook',
        description: 'A fast, offline workout logbook.',
        id: '/',
        theme_color: '#111311',
        background_color: '#111311',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__\/auth\//, /^\/__\/firebase\//],
      },
    }),
  ],
})