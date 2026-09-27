import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * The app is designed to be hosted from a repository sub-path on GitHub Pages
 * (for example https://<user>.github.io/myapp/). The base path can be overridden
 * at build time with BASE_PATH so the same code can be hosted at a domain root:
 *
 *   BASE_PATH=/ npm run build
 */
const basePath = process.env.BASE_PATH ?? '/myapp/'

export default defineConfig(({ mode }) => ({
  // Dev server always runs from "/" so local development needs no sub-path juggling.
  base: mode === 'production' ? basePath : '/',
  plugins: [
    react(),
    VitePWA({
      // "prompt" gives us an explicit "New version available - Update" banner instead
      // of silently swapping content while somebody is mid-lesson.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        id: basePath,
        name: 'Azure Learning Hub',
        short_name: 'Azure Hub',
        description:
          'Independent study app for Microsoft Azure certifications (AZ-900, AZ-104, AZ-400) and Azure / DevOps interview preparation.',
        lang: 'en',
        dir: 'ltr',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0b1220',
        theme_color: '#0b1220',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Old revisions are deleted on activation so a new deployment can never leave
        // somebody stranded on stale cached content.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: `${basePath}index.html`,
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    // The content chunk is deliberately large: this is an offline-first study
    // app, so the service worker precaches all 50 lessons on first visit and
    // every later navigation is served from cache. The framework and app-shell
    // chunks stay small, so first paint does not wait on the content.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        /**
         * Split by change frequency so a content-only deployment does not
         * invalidate the framework chunk in every learner's cache (and vice
         * versa). The course content is by far the largest part of this app,
         * and it changes far more often than React does.
         */
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('highlight.js')) return 'vendor-highlight'
            if (
              id.includes('react-router') ||
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('scheduler')
            ) {
              return 'vendor-react'
            }
            return 'vendor'
          }
          /*
           * One chunk per course, so editing an AZ-104 lesson does not
           * invalidate the cached AZ-400 content (and vice versa). With a
           * precaching service worker that is the difference between a small
           * update download and re-fetching every course.
           */
          if (id.includes('/src/content/az900/')) return 'content-az900'
          if (id.includes('/src/content/az104/')) return 'content-az104'
          if (id.includes('/src/content/az400/')) return 'content-az400'
          // Interview preparation is its own body of content on the same rule:
          // adding a question must not invalidate any cached course.
          // The learner's imported bank and interview rounds are several MB on
          // their own, so they get their own chunk: each stays well under the
          // service worker's precache size limit.
          if (/\/src\/content\/interview\/topics\/(my|rounds)-/.test(id)) {
            return 'content-interview-bank'
          }
          if (id.includes('/src/content/interview/')) return 'content-interview'
          if (id.includes('/src/content/')) return 'content-shared'
          return undefined
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Page tests render the whole app in jsdom, which is several times slower
    // on a shared CI runner than on a laptop. 5s (the default) was not enough.
    testTimeout: 20_000,
    alias: {
      // The generated service-worker registration module only exists during a
      // real build, so tests use a stub. The logic worth testing lives in
      // src/lib/sw-update.ts and is exercised directly.
      'virtual:pwa-register/react': new URL('./src/test/pwa-register-stub.ts', import.meta.url)
        .pathname,
    },
  },
}))
