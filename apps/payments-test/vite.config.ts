import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repo = resolve(__dirname, '../..');

// Like the playground: the library comes straight from src/ (HMR).
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^artisanform\/payments\/(.*)$/,
        replacement: `${resolve(repo, 'src/integrations/payments/providers')}/$1.tsx`,
      },
      { find: /^artisanform$/, replacement: resolve(repo, 'src/index.ts') },
      // UI kits (workspace packages) straight from their sources.
      {
        find: /^@beardartisans\/ui-([a-z]+)\/style\.css$/,
        replacement: `${resolve(repo, 'packages')}/ui-$1/src/style.css`,
      },
      {
        find: '@beardartisans/ui-shadcn/kit',
        replacement: resolve(repo, 'packages/ui-shadcn/kit.tsx'),
      },
      {
        find: /^@beardartisans\/ui-([a-z]+)$/,
        replacement: `${resolve(repo, 'packages')}/ui-$1/src/index`,
      },
      // The shadcn kit imports the user's own components: shadcn-styled ones here.
      {
        find: '@/components/ui',
        replacement: resolve(__dirname, 'src/shadcn'),
      },
    ],
  },
  server: {
    fs: { allow: [repo] },
    port: 5174,
    strictPort: true,
    proxy: { '/api': `http://localhost:${process.env.PORT ?? 8787}` },
  },
});
