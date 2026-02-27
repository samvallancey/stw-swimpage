import { defineConfig } from 'vite';

export default defineConfig({
  base: '/stw-swimpage/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  server: {
    port: 8080,
    open: false,
  },
});
