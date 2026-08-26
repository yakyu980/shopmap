import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/shopmap/' : '/',
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
  build: {
    rollupOptions: {
      output: {
        // שם-קובץ נבדל לחבילות tfjs/mobilenet (זיהוי-תמונה אמיתי) —
        // כדי שאפשר יהיה לא לכלול אותן ב-precache הנטען-מראש (~1MB),
        // אותו עיקרון בדיוק כמו tesseract/** למטה.
        manualChunks(id) {
          if (id.includes('@tensorflow') || id.includes('mobilenet')) return 'tfjs-vendor';
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
        // אותו עיקרון בדיוק ל-tfjs-vendor (זיהוי-תמונה אמיתי, ~1.1MB) —
        // נטען-מראש-ל-cache רק בשימוש-ראשון בפועל (פתיחת "חפש לפי
        // תמונה" וצילום), לא בהתקנת ה-service-worker.
        globIgnores: ['tesseract/**', 'mobilenet/**', '**/tfjs-vendor-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/tesseract/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-ocr-assets',
              expiration: { maxEntries: 10 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/mobilenet/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'mobilenet-model-assets',
              expiration: { maxEntries: 10 },
            },
          },
          {
            urlPattern: ({ url }) => /\/tfjs-vendor-.*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'tfjs-vendor-assets',
              expiration: { maxEntries: 5 },
            },
          },
        ],
      },
    }),
  ],
})
