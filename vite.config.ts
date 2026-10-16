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
        'src/**/__tests__/**',
        '.storybook/**/*',
      ],
    }),
  ],
  build: {
    lib: {
      // Provider plugins are separate entries so their SDKs stay optional.
      entry: {
        index: 'src/index.ts',
        'payments/stripe': 'src/integrations/payments/providers/stripe.tsx',
        'payments/lemonsqueezy':
          'src/integrations/payments/providers/lemonsqueezy.tsx',
        'payments/mercadopago':
          'src/integrations/payments/providers/mercadopago.tsx',
        'payments/paypal': 'src/integrations/payments/providers/paypal.tsx',
      },
      formats: ['es', 'cjs'],
      fileName: (format, name) =>
        `${name === 'index' ? 'artisanForm' : name}.${format === 'es' ? 'es.js' : 'cjs'}`,
    },
    rollupOptions: {
      external: (id) =>
        /^(react|react-dom|react-hook-form|@hookform|yup|zustand|@stripe|@mercadopago|@paypal)(\/|$)/.test(
          id,
        ),
    },
  },
});
