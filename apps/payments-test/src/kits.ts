import type { ArtisanUiKit } from 'artisanform';

export interface LoadedKit {
  kit?: ArtisanUiKit;
  /** Wrapper class some kits need (the SCSS theme scopes its tokens). */
  className?: string;
}

/**
 * Each kit's global CSS is imported only for the selected kit, and switching
 * kits reloads the page (see App), so Bootstrap/Tailwind never leak into each other.
 */
export const kits = {
  default: {
    label: 'Default (af-* CSS)',
    load: async (): Promise<LoadedKit> => ({}),
  },
  bootstrap: {
    label: 'Bootstrap',
    load: async (): Promise<LoadedKit> => {
      await import('bootstrap/dist/css/bootstrap.min.css');
      await import('@beardartisans/ui-bootstrap/style.css');
      return {
        kit: (await import('@beardartisans/ui-bootstrap')).bootstrapKit,
      };
    },
  },
  mui: {
    label: 'Material UI',
    load: async (): Promise<LoadedKit> => ({
      kit: (await import('@beardartisans/ui-mui')).muiKit,
    }),
  },
  tailwind: {
    label: 'Tailwind',
    load: async (): Promise<LoadedKit> => {
      await import('./tailwind.css');
      return { kit: (await import('@beardartisans/ui-tailwind')).tailwindKit };
    },
  },
  scss: {
    label: 'SCSS theme',
    load: async (): Promise<LoadedKit> => {
      await import('./scss-theme.scss');
      return { className: 'kit-scss' };
    },
  },
  shadcn: {
    label: 'shadcn/ui',
    load: async (): Promise<LoadedKit> => {
      await import('./tailwind.css');
      return {
        kit: (await import('@beardartisans/ui-shadcn/kit')).shadcnKit,
        className: 'kit-shadcn',
      };
    },
  },
} as const;

export type KitId = keyof typeof kits;
export const isKit = (id: string | null): id is KitId =>
  id !== null && id in kits;
