import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';

// Canonical origin: set SITE_URL in the deploy environment (no domain yet).
const site = process.env.SITE_URL ?? 'https://artisanform.example';
if (!process.env.SITE_URL) {
  console.warn(`[docs] SITE_URL is not set; using placeholder ${site}`);
}

const description =
  'ArtisanForm: a React library for declarative multi-step forms (wizards) with a JSON-serializable schema, 30+ field types, payments and themeable UI kits.';

export default defineConfig({
  site,
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  build: { inlineStylesheets: 'auto' },
  redirects: {
    '/schema-v1': '/docs/schema-v1/',
    '/ui': '/docs/ui/',
    '/es/schema-v1': '/es/docs/schema-v1/',
    '/es/ui': '/es/docs/ui/',
  },
  // Inline empty PostCSS config: the repo root one belongs to the library playground.
  vite: { plugins: [tailwindcss()], css: { postcss: {} } },
  integrations: [
    icon(),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es' } },
    }),
    starlight({
      title: 'ArtisanForm',
      description,
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        es: { label: 'Español', lang: 'es' },
      },
      favicon: '/favicon.svg',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/mastoreto/artisanForm',
        },
      ],
      customCss: ['./src/styles/tokens.css', './src/styles/starlight.css'],
      head: [
        { tag: 'meta', attrs: { name: 'theme-color', content: '#090a0d' } },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
        {
          tag: 'meta',
          attrs: { name: 'twitter:card', content: 'summary_large_image' },
        },
      ],
      sidebar: [
        {
          label: 'Documentation',
          translations: { es: 'Documentación' },
          autogenerate: { directory: 'docs' },
        },
      ],
    }),
  ],
});
