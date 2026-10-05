import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-static';
import path from 'path';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'index.html',
    }),
    alias: {
      $components: path.resolve('./src/components'),
      $lib: path.resolve('./src/lib'),
    },
  },
  compilerOptions: {
    hydratable: false,
  },
};
