// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        index: 'src/index.ts',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
