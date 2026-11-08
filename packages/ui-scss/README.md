# @beardartisans/ui-scss

Sass kit for [ArtisanForm](https://github.com/mastoreto/artisanForm): A Sass mixin that emits the `--artisan-*` tokens.

```bash
npm install artisanform @beardartisans/ui-scss sass
```

```scss
@use '@beardartisans/ui-scss' as af;

:root {
  @include af.theme((primary: #7c3aed));
}
```

This package is a peer of `artisanform` (`^0.3.0-beta.0`); the core never depends on it. Full guide, kit precedence rules and the other official kits: [docs/ui.md](https://github.com/mastoreto/artisanForm/blob/develop/docs/ui.md).

MIT license.
