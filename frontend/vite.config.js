import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app's routes are real filenames ("/home.html", "/reports.html", ...)
// because the legacy scripts hardcode them. Vite's dev server tries to read
// those files off disk, doesn't find them, and returns 404 — so every route
// except "/" was broken in `npm run dev`, even though Vercel rewrites them in
// production. This plugin reproduces the production rewrites locally.
const SPA_ROUTES = [
  '/home.html',
  '/dashboard.html',
  '/admin-employees.html',
  '/admin-import.html',
  '/admin-manual-entry.html',
  '/reports.html',
  '/audit-logs.html',
  '/themes.html',
  '/employees-current.html',
  '/employees-left.html',
  '/employees-new.html',
  '/employee.html',
]

function legacyHtmlRoutes() {
  return {
    name: 'iems-legacy-html-routes',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url || '').split('?')[0]
        if (SPA_ROUTES.includes(path)) req.url = '/index.html'
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), legacyHtmlRoutes()],
  server: {
    // `npm run dev` only serves the frontend. Point /api at a locally running
    // backend (node backend/server.js behind a small listener, or `vercel dev`)
    // so login and every data call work in development too.
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
