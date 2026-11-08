# @artisanform/ui-mui

Material UI kit for [ArtisanForm](https://github.com/mastoreto/artisanForm): Material UI controls inside `FormControl`. Needs `@mui/material`, `@emotion/react` and `@emotion/styled`.

```bash
npm install artisanform @artisanform/ui-mui
```

```tsx
import { ArtisanForm } from 'artisanform';
import { muiKit } from '@artisanform/ui-mui';

<ArtisanForm scheme={scheme} onSubmit={save} kit={muiKit} />;
```

This package is a peer of `artisanform` (`^0.3.0-beta.0`); the core never depends on it. Full guide, kit precedence rules and the other official kits: [docs/ui.md](https://github.com/mastoreto/artisanForm/blob/develop/docs/ui.md).

MIT license.
