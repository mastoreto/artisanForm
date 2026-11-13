import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import starlightLlmsTxt from 'starlight-llms-txt';

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
  vite: {
    plugins: [tailwindcss()],
    css: { postcss: {} },
    // Native binding lives next to satteri; bundling it breaks its lookup.
    ssr: { external: ['satteri', 'astro-og-canvas'] },
  },
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
      logo: { src: './src/assets/logo.svg', alt: '' },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/mastoreto/artisanForm',
        },
      ],
      customCss: ['./src/styles/tokens.css', './src/styles/starlight.css'],
      head: [
        {
          tag: 'meta',
          attrs: {
            name: 'theme-color',
            content: '#090a0d',
            media: '(prefers-color-scheme: dark)',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'theme-color',
            content: '#ffffff',
            media: '(prefers-color-scheme: light)',
          },
        },
        // Wide tables scroll horizontally: make them keyboard-reachable. Code
        // blocks are focusable regions: give each a unique accessible name.
        {
          tag: 'script',
          content:
            "const fix=()=>{for(const t of document.querySelectorAll('.sl-markdown-content table')){if(t.scrollWidth>t.clientWidth)t.tabIndex=0}document.querySelectorAll('pre[role=region]:not([aria-label])').forEach((p,i)=>p.setAttribute('aria-label','Code '+(i+1)+(p.dataset.language?' ('+p.dataset.language+')':'')))};addEventListener('DOMContentLoaded',()=>{fix();new MutationObserver(fix).observe(document.body,{subtree:true,attributes:true,attributeFilter:['role']})})",
        },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: new URL('/og/en.png', site).href,
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image',
            content: new URL('/og/en.png', site).href,
          },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:card', content: 'summary_large_image' },
        },
      ],
      plugins: [
        starlightLlmsTxt({
          projectName: 'ArtisanForm',
          description,
          details:
            'ArtisanForm never handles secrets or card data: amounts, orders and upload signatures are resolved by your backend. Third-party SDKs are optional peers. The public schema contract stays serializable and independent of the form engine. 0.x beta, not published to a registry yet.',
          optionalLinks: [
            {
              label: 'Source code',
              url: 'https://github.com/mastoreto/artisanForm',
              description: 'GitHub repository',
            },
          ],
        }),
      ],
      sidebar: [
        {
          label: 'Start',
          translations: { es: 'Empezar' },
          items: [
            {
              slug: 'docs',
              label: 'Quickstart',
              translations: { es: 'Inicio rápido' },
            },
          ],
        },
        {
          label: 'Guides',
          translations: { es: 'Guías' },
          items: [
            { slug: 'docs/schema-v1', label: 'Schema v1' },
            {
              slug: 'docs/backend',
              label: 'Backend guide',
              translations: { es: 'Guía de backend' },
            },
            {
              slug: 'docs/ui',
              label: 'UI and kits',
              translations: { es: 'UI y kits' },
            },
            {
              slug: 'docs/builder',
              label: 'Visual builder',
              translations: { es: 'Constructor visual' },
            },
            {
              slug: 'docs/payments',
              label: 'Payments',
              translations: { es: 'Pagos' },
            },
            {
              slug: 'docs/files',
              label: 'Files and storage',
              translations: { es: 'Archivos y storage' },
            },
            {
              slug: 'docs/accessibility',
              label: 'Accessibility and environments',
              translations: { es: 'Accesibilidad y entornos' },
            },
            {
              slug: 'docs/releasing',
              label: 'Releasing',
              translations: { es: 'Release' },
            },
          ],
        },
        {
          label: 'Reference',
          translations: { es: 'Referencia' },
          items: [{ autogenerate: { directory: 'docs/reference' } }],
        },
        {
          label: 'Migration',
          translations: { es: 'Migración' },
          items: [{ autogenerate: { directory: 'docs/migrate' } }],
        },
      ],
    }),
  ],
});
