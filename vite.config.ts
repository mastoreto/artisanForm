/** @type {import('vite').UserConfig} */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

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
      // Provider plugins are separate entries so their SDKs stay optional.
      entry: {
        index: 'src/index.ts',
        'payments/stripe': 'src/payments/stripe.tsx',
      },
      formats: ['es', 'cjs'],
      fileName: (format, name) =>
        `${name === 'index' ? 'artisanForm' : name}.${format === 'es' ? 'es.js' : 'cjs'}`,
    },
    rollupOptions: {
      external: (id) =>
        /^(react|react-dom|formik|yup|zustand|@stripe)(\/|$)/.test(id),
    },
  },
});
