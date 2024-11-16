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
            exclude: ['src/**/*.stories.tsx','.storybook/**/*'],
        }),
    ],
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'ArtisanForm',
            fileName: (format) => `artisanForm.${format}.js`,
        },
    },
});