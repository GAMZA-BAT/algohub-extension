// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        contentBoj: 'src/contentBoj.ts',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
