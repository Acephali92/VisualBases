import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // relative base: works on GitHub Pages (/VisualBases/), any sub-path and file hosting
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'VisualBases – Foreign military bases worldwide',
        short_name: 'VisualBases',
        description: 'Interactive open-data atlas of foreign military bases worldwide.',
        theme_color: '#07090f',
        background_color: '#07090f',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        // keep the first visit light: map engine, country shapes, share preview and non-Latin font
        // subsets are cached on first use instead of being downloaded up front
        globIgnores: [
          '**/og.png',
          '**/data/research.json',
          '**/data/taxonomy.json',
          '**/assets/map-*',
          '**/assets/maplibre-gl-worker-*',
          '**/assets/countries-*',
          '**/assets/shareImage-*',
          '**/assets/inter-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // hashed build files never change under the same name
            urlPattern: /\/assets\/.+\.(js|css|woff2)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'assets', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 180 } },
          },
          {
            urlPattern: /\/data\/research\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'research' },
          },
          {
            urlPattern: /\/media\/.+\.webp$/,
            handler: 'CacheFirst',
            options: { cacheName: 'media', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
          {
            urlPattern: /^https:\/\/tiles\.maps\.eox\.at\//,
            handler: 'CacheFirst',
            options: { cacheName: 'satellite-tiles', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 1200 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
