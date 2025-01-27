// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        contentProgrammers: 'src/contentProgrammers.ts',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
