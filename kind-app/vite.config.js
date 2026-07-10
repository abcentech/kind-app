import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // relative base so the app works at the domain root or any subpath (e.g. kidsinspiringnation.org/app/)
  base: './',
  plugins: [react()],
  server: { port: 5183 },
})
