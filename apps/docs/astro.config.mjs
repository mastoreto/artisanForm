import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// Hosting-neutral. By default the site is served from the root (what Vercel
// needs). The GitHub Pages workflow (.github/workflows/docs.yml) sets:
//   DOCS_BASE=/artisanForm  DOCS_SITE=https://mastoreto.github.io
//   DOCS_STORYBOOK_URL=https://mastoreto.github.io/artisanForm/storybook/
const base = process.env.DOCS_BASE ?? '/';
const site = process.env.DOCS_SITE;
const storybook = process.env.DOCS_STORYBOOK_URL;

export default defineConfig({
  ...(site ? { site } : {}),
  base,
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
        // The link is absolute on purpose: a relative one would be localized
        // (/es/storybook/). It only appears where Storybook is deployed.
        ...(storybook
          ? [
              {
                label: 'Storybook',
                translations: { es: 'Storybook' },
                link: storybook,
                attrs: { target: '_blank' },
              },
            ]
          : []),
      ],
    }),
  ],
});
