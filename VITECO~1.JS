import { defineConfig } from 'vite';

export default defineConfig({
  // En producción Vercel sirve dist/ como estático y api/ como funciones serverless.
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020',
  },
  server: {
    port: 5173,
    open: false,
    // Proxy /api al puerto donde corre `vercel dev` para que `npm run dev` también
    // pueda invocar las funciones serverless en local. Si solo usas `vercel dev`
    // directamente, este proxy no se aplica.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
});
