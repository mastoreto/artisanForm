# @beardartisans/ui-tailwind

Tailwind CSS kit for [ArtisanForm](https://github.com/mastoreto/artisanForm): Utility classes with `unstyled`. Tell Tailwind to scan the package, e.g. `content: ['./node_modules/@beardartisans/ui-tailwind/dist/**/*.js']` (Tailwind 3).

```bash
npm install artisanform @beardartisans/ui-tailwind
pnpm add artisanform @beardartisans/ui-tailwind
yarn add artisanform @beardartisans/ui-tailwind
bun add artisanform @beardartisans/ui-tailwind
```

```tsx
import { ArtisanForm } from 'artisanform';
import { tailwindKit } from '@beardartisans/ui-tailwind';

<ArtisanForm scheme={scheme} onSubmit={save} kit={tailwindKit} />;
```

This package is a peer of `artisanform` (`^0.3.0-beta.0`); the core never depends on it. Full guide, kit precedence rules and the other official kits: [docs/ui.md](https://github.com/mastoreto/artisanForm/blob/develop/docs/ui.md).

MIT license.
