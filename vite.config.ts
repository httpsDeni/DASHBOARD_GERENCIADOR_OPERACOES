import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    target: 'ES2020',
    outDir: 'dist',
    minify: 'terser',
  },
  server: {
    port: 5173,
  },
});
