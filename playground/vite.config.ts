import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repo = resolve(__dirname, '..');

// Consumes the library straight from src/ so edits show up instantly (HMR).
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: [
      // Subpaths first: the bare name would otherwise swallow them.
      {
        find: /^artisanform\/payments\/(.*)$/,
        replacement: `${resolve(repo, 'src/integrations/payments/providers')}/$1.tsx`,
      },
      { find: /^artisanform$/, replacement: resolve(repo, 'src/index.ts') },
    ],
  },
  css: { postcss: repo },
  server: { port: 5173, fs: { allow: [repo] } },
});
