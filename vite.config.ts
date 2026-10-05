import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    target: 'ES2020',
    minify: 'terser',
  },
  server: {
    port: 5173,
  },
});
