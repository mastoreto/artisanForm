import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { reactCompiler } from '../react-compiler.ts';

const repo = resolve(__dirname, '..');

// Consumes the library straight from src/ so edits show up instantly (HMR).
export default defineConfig({
  root: __dirname,
  plugins: [react({ compiler: reactCompiler })],
  resolve: {
    alias: [
      // Subpaths first: the bare name would otherwise swallow them.
      {
        find: /^artisanform\/payments\/(.*)$/,
        replacement: `${resolve(repo, 'src/integrations/payments/providers')}/$1.tsx`,
      },
      {
        find: /^artisanform\/builder\.css$/,
        replacement: resolve(repo, 'src/builder/builder.css'),
      },
      {
        find: /^artisanform\/builder$/,
        replacement: resolve(repo, 'src/builder/index.ts'),
      },
      { find: /^artisanform$/, replacement: resolve(repo, 'src/index.ts') },
      // UI kits (workspace packages) straight from their sources.
      {
        find: /^@beardartisans\/ui-([a-z]+)\/style\.css$/,
        replacement: `${resolve(repo, 'packages')}/ui-$1/src/style.css`,
      },
      {
        find: /^@beardartisans\/ui-([a-z]+)$/,
        replacement: `${resolve(repo, 'packages')}/ui-$1/src/index`,
      },
    ],
  },
  css: { postcss: repo },
  build: { outDir: resolve(__dirname, 'dist'), emptyOutDir: true },
  server: { port: 5173, fs: { allow: [repo] } },
});
