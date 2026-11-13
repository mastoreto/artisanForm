# Release

> 🌐 Versión en español de [releasing.md](../releasing.md) (el original, en inglés, es la referencia). Si cambia el original, actualizá esta copia.

Cómo se publica ArtisanForm en npm. Se publican cinco paquetes juntos, todos con la misma versión:

| Paquete | Qué es |
| --- | --- |
| `artisanform` | La librería núcleo (sin scope) |
| `@beardartisans/ui-bootstrap` | Kit de Bootstrap 5 |
| `@beardartisans/ui-mui` | Kit de Material UI |
| `@beardartisans/ui-tailwind` | Kit de Tailwind CSS |
| `@beardartisans/ui-scss` | Tema de Sass (mixin de tokens) |

`@beardartisans/ui-shadcn` es **privado**: es un item de registry para copiar y pegar, no un paquete de npm.

## Ramas y versiones

- `develop` es integración; `main` es lo que se publica. Nadie commitea directo a ninguna: los cambios llegan por pull request, y `develop` → `main` es solo para releases.
- Los kits tienen al núcleo como peer (`artisanform@^<versión>`), así que se publican **en lockstep**: el mismo número de versión, en este orden: núcleo, bootstrap, mui, tailwind, scss. `check:pack` falla si la versión de un kit difiere de la del núcleo.
- Las pre-releases usan el sufijo `-beta.N` o `-rc.N`. Qué dist-tag de npm recibe una versión, y cómo la siguen los tags de git y los Releases de GitHub, es una sola regla: [Versiones, tags y releases](#versiones-tags-y-releases-la-regla-única).

## Configuración inicial (una sola vez)

1. **Cuenta de npm con 2FA** y una **organización** de npm llamada `beardartisans` (el plan gratuito alcanza para paquetes públicos). Quien publica tiene que ser miembro con permiso para publicar.
2. **Trusted Publishing** para los cinco paquetes ([más abajo](#trusted-publishing-sin-token)). Reemplaza al secreto `NPM_TOKEN`; npm está restringiendo los tokens que saltean el 2FA, así que un token solo puede no alcanzar para publicar (mirá la fila `EOTP` de la tabla de problemas).

## Sacar un release

1. Verificá que `develop` esté en verde en el CI y que el changelog (`CHANGELOG.md` y `docs/es/CHANGELOG.md`) describa el release.
2. Poné la versión nueva en el `package.json` raíz **y** en los cuatro kits (`packages/ui-*/package.json`), y actualizá el rango de `peerDependencies.artisanform` de los kits si cambió el minor. Abrí un PR a `develop`.
3. Mergeá `develop` en `main` con un pull request.
4. En **Actions → Release → Run workflow**, elegí la rama `main`, y mantené **`dry-run` activado**. Verificá que termine en verde y leé la línea `version … -> dist-tag …` que imprime.
5. Corrélo de nuevo con `dry-run` **desactivado**. Esto publica de verdad y **no se puede deshacer**: un número de versión publicado no se puede volver a usar nunca. También crea el tag de git y el Release de GitHub.
6. Verificá el resultado desde el registro, con los paquetes reales instalados en una app limpia:

   ```bash
   ARTISAN_SPEC=<versión> node scripts/consumer-test.mjs 19
   ```

   Instala el núcleo y los kits de bootstrap, MUI y Tailwind desde npm, los tipa contra la prop `kit` y compila una app Vite limpia (usá `18` en lugar de `19` para React 18).

## Versiones, tags y releases (la regla única)

Un único número de versión identifica un release en todos lados, y todo lo demás se deriva de él:

| Dónde | Qué | Cómo |
| --- | --- | --- |
| Código | `version` del `package.json` raíz y de los cuatro kits | idéntica; `check:pack` falla si no |
| Git | tag `vX.Y.Z[-pre.N]` sobre el commit de `main` que se publicó | lo crea el workflow `Release` |
| GitHub | un Release por tag, marcado *pre-release* cuando la versión tiene `-` | lo crea el workflow, con notas generadas |
| npm | exactamente dos dist-tags, `latest` y `next` | ver abajo |

Dist-tags de npm:

- Una versión **estable** (sin `-`) se publica como `latest`.
- Una **pre-release** (`-beta.N`, `-rc.N`) se publica como `next`, **salvo mientras no exista una versión estable**: entonces va a `latest`, así un `npm install artisanform` sin tag y la página de npm muestran el build más nuevo y no una pre-release vieja. Desde la primera versión estable, `latest` solo se mueve con versiones estables.
- **No hay tags `beta` ni `rc`**: el sufijo de la versión ya dice qué es. No inventes un tag nuevo; un tag por canal es como `latest`, `beta` y `rc` terminaron en tres versiones distintas.
- El workflow calcula el tag a partir de la versión; no hay un input para elegirlo. Publicar a mano sigue la misma regla (`TAG` más abajo).

## Release candidate y estable (1.0.0)

1. **`1.0.0-rc.N`**: el contrato está congelado ([versionado](versioning.md)); solo entran correcciones. Se publica como `latest` (todavía no existe una estable); verificá desde el registro (`ARTISAN_SPEC=1.0.0-rc.4 node scripts/consumer-test.mjs 19`, `18` y `node scripts/consumer-schema.mjs`).
2. **Criterios de salida para 1.0.0:** al menos dos semanas sin cambios de contrato (`check:api` y los fixtures golden sin tocar) y sin issues P0/P1 abiertos; CI en verde en todos los jobs, incluido `perf` en los tres navegadores; documentación en inglés y español sincronizada. Si algo de esto falla, sale una nueva `rc.N`, no un parche sobre el candidato.
3. **`1.0.0`**: subí la versión de los cinco paquetes (y el `peerDependencies.artisanform` de los kits a `^1.0.0`) y publicala como `latest`. Desde ahí `latest` solo se mueve con versiones estables y las pre-releases posteriores van a `next`.
4. Deprecá las betas reemplazadas (`npm deprecate artisanform@"<1.0.0" "Usá 1.x"`) cuando `latest` sea estable.

## Qué hace el workflow `Release`

`.github/workflows/release.yml` es manual (`workflow_dispatch`) con dos entradas, `tag` y `dry-run` (por defecto **true**). Corre, en este orden: lint, typecheck, build, build de los kits, typecheck de los kits, `check:dist`, `check:package` (publint y attw), `check:kits`, `check:pack` y los tests unitarios. Recién después corre `npm publish --provenance --access public --tag <tag> --ignore-scripts` en cada paquete.

- **Una publicación real se rechaza salvo que el workflow corra desde `main`.** Un dry run funciona desde cualquier rama.
- `--ignore-scripts` es a propósito: todos los chequeos ya corrieron en los pasos anteriores, y el `prepublishOnly` del núcleo los repetiría (dentro de un `--dry-run` su `npm pack` anidado no escribe el tarball, y eso rompe `attw --pack`).
- `--provenance` enlaza cada paquete en npm con el commit y el workflow exactos que lo construyeron. Solo funciona desde un CI compatible como GitHub Actions, así que las publicaciones manuales no lo llevan.
- Un dry run prueba el build y los tarballs, **no las credenciales**: los problemas de permisos y de 2FA recién aparecen en una publicación real.

## Publicar a mano (primer release)

Si el token no puede publicar desde el CI (ver la sección siguiente), publicá las primeras versiones vos mismo desde un clon actualizado de `main`. npm te pide tu código de un solo uso en cada `publish`.

Antes de publicar a mano, corré `bun run check:publish` después de construir. Falla si un kit resuelve `artisanform` en otro lugar que no sea la raíz del repo, si un `dist` es más viejo que sus fuentes o si un `.d.ts` publicado no compila, y luego instala el núcleo y los kits empacados en apps limpias con React 18 y 19. Un kit construido donde `artisanform` no se resuelve publica tipos rotos (pasó en 0.3.0-beta.1). El workflow Release corre el mismo gate antes de publicar; el CI lo corre sin el paso del consumidor.

```bash
git checkout main && git pull
bun install && bun run build && bun run build:kits
npm login                                              # tu usuario, con 2FA
TAG=latest   # una versión estable, o una pre-release mientras no exista una estable; si no, next

# Sin --ignore-scripts acá: el `prepublishOnly` del núcleo reconstruye todo y corre las puertas, y
# el de cada kit rechaza un build viejo. Son la red de seguridad de una publicación manual.
npm publish --access public --tag $TAG
(cd packages/ui-bootstrap && npm publish --access public --tag $TAG)
(cd packages/ui-mui       && npm publish --access public --tag $TAG)
(cd packages/ui-tailwind  && npm publish --access public --tag $TAG)
(cd packages/ui-scss      && npm publish --access public --tag $TAG)
```

Después comprobá qué sirve realmente el registro y corré la verificación del paso 6 de arriba:

```bash
node scripts/verify-registry.mjs   # descarga los cinco tarballs y verifica sus archivos y los exports del schema
```

Si falla, **no intentes arreglar la versión publicada**: npm nunca deja reemplazar una. Publicá la siguiente y hacé `npm deprecate` de la mala (`npm deprecate "artisanform@1.0.0-rc.3" "Build roto, usá 1.0.0-rc.4"`).

## Trusted Publishing (sin token)

npm puede confiar directamente en un workflow de GitHub (OIDC), así que **no hace falta `NPM_TOKEN`** y el provenance viene incluido. El workflow tiene `id-token: write` y ya no lee ningún token.

1. Una vez por paquete (los cinco; el paquete tiene que existir), registrá el workflow como publicador de confianza. Necesita tu login de npm y un código 2FA, así que se hace a mano:

   ```bash
   for p in artisanform @beardartisans/ui-bootstrap @beardartisans/ui-mui @beardartisans/ui-tailwind @beardartisans/ui-scss; do
     npm trust github "$p" --repo mastoreto/artisanForm --file release.yml --yes
   done
   ```

   Lo mismo se puede hacer en la web: paquete → **Settings → Trusted Publisher** → GitHub Actions, repositorio `mastoreto/artisanForm`, workflow `release.yml`. Comprobalo con `npm trust list <paquete>`.
2. Borrá el secreto `NPM_TOKEN` del repositorio.
3. Corré el workflow `Release` desde `main` con `dry-run` activado y luego desactivado. Hace falta un CLI de npm reciente (11.5.1 o superior; Node 24 en el runner trae uno compatible). El nombre del archivo del workflow tiene que coincidir con el que registraste.

## Resolución de problemas

| Qué ves | Causa y solución |
| --- | --- |
| `E403 Forbidden - PUT …/artisanform` | El token no puede escribir en ese paquete o scope. Usá un token granular con lectura y escritura sobre **todos los paquetes** (y la organización `beardartisans`), y verificá que tu usuario pueda publicar en la organización. |
| `EOTP: This operation requires a one-time password` | npm pide un código 2FA y el CI no puede escribirlo. Reactivá *Bypass two-factor authentication* en el token; si sigue pasando, npm ya no acepta tokens con bypass para publicar directo en tu cuenta (su log lo dice). Publicá las primeras versiones a mano y después pasá a Trusted Publishing. |
| `ENOENT … artisanform-<versión>.tgz` en `check:package` durante `npm publish --dry-run` | El `prepublishOnly` del núcleo corrió dentro de un dry run, donde `npm pack` no escribe el tarball. El workflow lo evita con `--ignore-scripts`; hacé lo mismo cuando hagas un dry run a mano. |
| `402 Payment Required … You must sign up for private packages` | Los paquetes con scope son privados por defecto, y los privados requieren un plan pago. Cada kit define `publishConfig.access: "public"`; mantenelo, y mantené `--access public`. |
| `You cannot publish over the previously published versions` | Esa versión ya existe. Subí la versión (también en los kits). Mirá qué paquetes llegaron con `curl https://registry.npmjs.org/<paquete>` antes de reintentar un release parcial. |
| `check:pack` informa una diferencia de versión | La `version` de un kit difiere de la del núcleo. Publicalos en lockstep. |
| `Cannot find name 'ArtisanUiKit'` en un proyecto que instaló un kit | El kit se construyó donde `artisanform` no se resolvía, así que su `.d.ts` no tiene el import. Arreglá el enlace (`bun install`), reconstruí, verificá con `bun run check:publish` y publicá una versión nueva: una versión publicada no se puede corregir. |

Todo intento que llega a `--provenance`, aunque falle, deja una entrada firmada en el registro público de transparencia de Sigstore. Es inofensiva y no se puede borrar.
