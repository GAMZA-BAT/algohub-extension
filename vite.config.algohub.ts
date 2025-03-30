// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        contentAlgohub: 'src/contentAlgohub.ts',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
