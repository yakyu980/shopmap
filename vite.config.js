import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SuperNav AI',
        short_name: 'SuperNav AI',
        description: 'ה-Waze של הסופר — MVP הדגמה',
        theme_color: '#16a34a',
        background_color: '#f4f6f8',
        display: 'standalone',
        lang: 'he',
        dir: 'rtl',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],
})
