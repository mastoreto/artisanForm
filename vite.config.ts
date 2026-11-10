/** @type {import('vite').UserConfig} */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { reactCompiler } from './react-compiler.ts';

export default defineConfig({
  plugins: [
    react({ compiler: reactCompiler }),
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
    sourcemap: true,
    lib: {
      cssFileName: 'style',
      // Provider plugins are separate entries so their SDKs stay optional.
      entry: {
        index: 'src/index.ts',
        // No stylesheet: for UIs built from scratch (see docs/headless.md).
        headless: 'src/headless.ts',
        'payments/stripe': 'src/integrations/payments/providers/stripe.tsx',
        'payments/lemonsqueezy':
          'src/integrations/payments/providers/lemonsqueezy.tsx',
        'payments/mercadopago':
          'src/integrations/payments/providers/mercadopago.tsx',
        'payments/paypal': 'src/integrations/payments/providers/paypal.tsx',
      },
      // ESM only: nothing was published as CJS yet and there is no need for it.
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      external: (id) =>
        /^(react|react-dom|react-compiler-runtime|react-hook-form|@hookform|yup|zustand|@stripe|@mercadopago|@paypal)(\/|$)/.test(
          id,
        ),
    },
  },
});
