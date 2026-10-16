/** @type {import('vite').UserConfig} */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    dts({
      include: ['src/**/*'],
      exclude: [
        'src/**/*.stories.tsx',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        '.storybook/**/*',
      ],
    }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => `artisanForm.${format === 'es' ? 'es.js' : 'cjs'}`,
    },
    rollupOptions: {
      external: (id) => /^(react|react-dom|formik|yup|zustand)(\/|$)/.test(id),
    },
  },
});
