# @beardartisans/ui-bootstrap

Bootstrap 5 kit for [ArtisanForm](https://github.com/mastoreto/artisanForm): Bootstrap 5 classes only (no `react-bootstrap`). Load Bootstrap's CSS and `@beardartisans/ui-bootstrap/style.css`.

```bash
npm install artisanform @beardartisans/ui-bootstrap
pnpm add artisanform @beardartisans/ui-bootstrap
yarn add artisanform @beardartisans/ui-bootstrap
bun add artisanform @beardartisans/ui-bootstrap
```

```tsx
import { ArtisanForm } from 'artisanform';
import { bootstrapKit } from '@beardartisans/ui-bootstrap';

<ArtisanForm scheme={scheme} onSubmit={save} kit={bootstrapKit} />;
```

This package is a peer of `artisanform` (`^0.3.0-beta.0`); the core never depends on it. Full guide, kit precedence rules and the other official kits: [docs/ui.md](https://github.com/mastoreto/artisanForm/blob/develop/docs/ui.md).

MIT license.
