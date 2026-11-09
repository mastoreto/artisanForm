import { OGImageRoute } from 'astro-og-canvas';
import { en } from '../../i18n/landing.en';
import { es } from '../../i18n/landing.es';

// 1200x630 share cards for the landing pages (/og/en.png, /og/es.png).
export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'route',
  pages: {
    en: {
      title: `${en.hero.titleA} ${en.hero.titleB}`,
      description: en.hero.lead,
    },
    es: {
      title: `${es.hero.titleA} ${es.hero.titleB}`,
      description: es.hero.lead,
    },
  },
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    bgGradient: [
      [9, 10, 13],
      [27, 32, 44],
    ],
    border: { color: [249, 115, 22], width: 12, side: 'inline-start' },
    padding: 72,
    font: {
      title: {
        color: [255, 255, 255],
        size: 76,
        weight: 'Bold',
        lineHeight: 1.1,
      },
      description: { color: [148, 163, 184], size: 34, lineHeight: 1.35 },
    },
  }),
});
