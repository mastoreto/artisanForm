import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ include: ['src'] })],
  build: {
    sourcemap: true,
    lib: {
      entry: 'src/index.tsx',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: (id) =>
        /^(react|react-dom|artisanform|@mui|@emotion)(\/|$)/.test(id),
    },
  },
});
