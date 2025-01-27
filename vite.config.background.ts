// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: 'src/background.ts',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
