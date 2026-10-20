import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    starlight({
      title: 'ArtisanForm',
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        es: { label: 'Español' },
      },
      sidebar: [
        { label: 'Start', slug: 'index' },
        { label: 'Schema v1', slug: 'schema-v1' },
        { label: 'UI extension', slug: 'ui' },
      ],
    }),
  ],
});
