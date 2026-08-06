import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SuperNav AI',
        short_name: 'SuperNav AI',
        description: 'ה-Waze של הסופר — MVP הדגמה',
        theme_color: '#2f7de1',
        background_color: '#f2f4f7',
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
        // נכסי-ה-OCR (worker/core-wasm/heb.traineddata, כ-7.6MB) לא
        // נטענים-מראש (precache) בהתקנת ה-service-worker — רק בשימוש
        // ראשון בפועל (CacheFirst), כדי לא להכביד על עמידה-לטעינה-
        // ראשונית של האפליקציה. אחרי שימוש-ראשון הם נשמרים ל-cache
        // ועובדים אופליין כמו כל שאר האפליקציה.
        globIgnores: ['tesseract/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/tesseract/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-ocr-assets',
              expiration: { maxEntries: 10 },
            },
          },
        ],
      },
    }),
  ],
})
