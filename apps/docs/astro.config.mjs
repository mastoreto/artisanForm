import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    starlight({
      title: 'ArtisanForm',
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        es: { label: 'Español', lang: 'es' },
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/mastoreto/artisanForm',
        },
      ],
      sidebar: [
        { label: 'Start', translations: { es: 'Inicio' }, slug: 'index' },
        { label: 'Schema v1', slug: 'schema-v1' },
        {
          label: 'UI extension and kits',
          translations: { es: 'Extensión de UI y kits' },
          slug: 'ui',
        },
        { label: 'Payments', translations: { es: 'Pagos' }, slug: 'payments' },
        {
          label: 'Files and storage',
          translations: { es: 'Archivos y storage' },
          slug: 'files',
        },
        {
          label: 'Accessibility and environments',
          translations: { es: 'Accesibilidad y entornos' },
          slug: 'accessibility',
        },
        {
          label: 'Releasing',
          translations: { es: 'Release' },
          slug: 'releasing',
        },
      ],
    }),
  ],
});
