/// <reference types="vitest/config" />
import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Colours here must match src/app/theme/tokens.css (--color-bg).
const BG = '#0d1117'

function gitVersion(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Served from https://<user>.github.io/ccna-games/
  base: '/ccna-games/',
  define: {
    __APP_VERSION__: JSON.stringify(gitVersion()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered from src/app/pwa.ts so we control update checks and reloads.
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'CCNA Games',
        short_name: 'CCNA Games',
        description: 'Practice games for the CCNA 200-301 v2.0 exam.',
        theme_color: BG,
        background_color: BG,
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the whole app shell so the hub loads in airplane mode.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        // A new version takes over open pages straight away; pwa.ts then reloads at a safe moment.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
  },
})
