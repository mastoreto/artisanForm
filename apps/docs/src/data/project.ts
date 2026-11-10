// Single source of truth for facts shown on the landing and in structured data.
import pkg from '../../../../package.json';

export const project = {
  name: 'ArtisanForm',
  version: pkg.version,
  license: pkg.license,
  repo: 'https://github.com/mastoreto/artisanForm',
  peers: {
    react: pkg.peerDependencies.react,
    'react-hook-form': pkg.peerDependencies['react-hook-form'],
    yup: pkg.peerDependencies.yup,
    zustand: pkg.peerDependencies.zustand,
  },
  kits: [
    { id: 'tailwind', pkg: '@beardartisans/ui-tailwind' },
    { id: 'shadcn', pkg: '@beardartisans/ui-shadcn' },
    { id: 'mui', pkg: '@beardartisans/ui-mui' },
    { id: 'bootstrap', pkg: '@beardartisans/ui-bootstrap' },
    { id: 'scss', pkg: '@beardartisans/ui-scss' },
  ],
} as const;

export const SITE = (import.meta.env.SITE ?? '').replace(/\/$/, '');

/** Package managers offered next to every install command. */
export const managers = [
  { id: 'npm', add: 'npm install' },
  { id: 'pnpm', add: 'pnpm add' },
  { id: 'yarn', add: 'yarn add' },
  { id: 'bun', add: 'bun add' },
] as const;
