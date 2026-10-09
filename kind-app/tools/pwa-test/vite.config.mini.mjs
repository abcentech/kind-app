// Builds the throwaway site with the REAL plugins from ../../vite.config.js.
//   env: KIND_TEST_ROOT (site dir), KIND_TEST_PUBLIC (public dir), KIND_TEST_VERSION
import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { kindHtml, kindServiceWorker } from '../../vite.config.js'

const app = resolve(import.meta.dirname, '..', '..')
export default defineConfig({
  root: process.env.KIND_TEST_ROOT,
  publicDir: process.env.KIND_TEST_PUBLIC,
  base: './',
  logLevel: 'warn',
  plugins: [kindHtml(), kindServiceWorker()],
  define: { __APP_VERSION__: JSON.stringify(process.env.KIND_TEST_VERSION || 'v1') },
  resolve: { alias: { '@kind/pwa': resolve(app, 'src/pwa.js'), '@kind/fonts': resolve(app, 'src/styles/fonts.css'), '@kind/ics': resolve(app, 'src/lib/ics.js') } },
  build: { emptyOutDir: true, reportCompressedSize: false },
})
