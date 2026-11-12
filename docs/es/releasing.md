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
- Las pre-releases usan el sufijo `-beta.N` y el dist-tag `beta`. La **primera** publicación de un paquete también fija `latest` (npm lo hace cuando el paquete todavía no tiene `latest`), así que hasta el primer release estable un simple `npm install artisanform` instala la beta; eso fue lo que pasó con `0.3.0-beta.0`. Cuando se publique una versión estable con `--tag latest`, las siguientes publicaciones con `--tag beta` dejan `latest` como está. Una beta se instala de forma explícita con `npm install artisanform@beta`.

## Configuración inicial (una sola vez)

1. **Cuenta de npm con 2FA** y una **organización** de npm llamada `beardartisans` (el plan gratuito alcanza para paquetes públicos). Quien publica tiene que ser miembro con permiso para publicar.
2. Un **token de acceso granular**: lectura y escritura sobre *todos los paquetes* (el `artisanform` sin scope no existe antes de su primer release, así que no se puede elegir individualmente), con *Bypass two-factor authentication* activado. Guardalo como secreto del repositorio `NPM_TOKEN` (Settings → Secrets and variables → Actions). Nunca lo pegues en un issue, un PR ni un chat.
3. Leé la fila `EOTP` de [Resolución de problemas](#resolución-de-problemas): npm está restringiendo los tokens con bypass para publicar directo, así que este token puede no alcanzar por sí solo.

## Sacar un release

1. Verificá que `develop` esté en verde en el CI y que el changelog (`CHANGELOG.md` y `docs/es/CHANGELOG.md`) describa el release.
2. Poné la versión nueva en el `package.json` raíz **y** en los cuatro kits (`packages/ui-*/package.json`), y actualizá el rango de `peerDependencies.artisanform` de los kits si cambió el minor. Abrí un PR a `develop`.
3. Mergeá `develop` en `main` con un pull request.
4. En **Actions → Release → Run workflow**, elegí la rama `main`, dejá `tag` en `beta` (o el dist-tag que quieras) y mantené **`dry-run` activado**. Verificá que termine en verde.
5. Corrélo de nuevo con `dry-run` **desactivado**. Esto publica de verdad y **no se puede deshacer**: un número de versión publicado no se puede volver a usar nunca.
6. Verificá el resultado desde el registro, con los paquetes reales instalados en una app limpia:

   ```bash
   ARTISAN_SPEC=0.3.0-beta.0 node scripts/consumer-test.mjs 19
   ```

   Instala el núcleo y los kits de bootstrap, MUI y Tailwind desde npm, los tipa contra la prop `kit` y compila una app Vite limpia (usá `18` en lugar de `19` para React 18).

## Qué hace el workflow `Release`

`.github/workflows/release.yml` es manual (`workflow_dispatch`) con dos entradas, `tag` y `dry-run` (por defecto **true**). Corre, en este orden: lint, typecheck, build, build de los kits, typecheck de los kits, `check:dist`, `check:package` (publint y attw), `check:kits`, `check:pack` y los tests unitarios. Recién después corre `npm publish --provenance --access public --tag <tag> --ignore-scripts` en cada paquete.

- **Una publicación real se rechaza salvo que el workflow corra desde `main`.** Un dry run funciona desde cualquier rama.
- `--ignore-scripts` es a propósito: todos los chequeos ya corrieron en los pasos anteriores, y el `prepublishOnly` del núcleo los repetiría (dentro de un `--dry-run` su `npm pack` anidado no escribe el tarball, y eso rompe `attw --pack`).
- `--provenance` enlaza cada paquete en npm con el commit y el workflow exactos que lo construyeron. Solo funciona desde un CI compatible como GitHub Actions, así que las publicaciones manuales no lo llevan.
- Un dry run prueba el build y los tarballs, **no las credenciales**: los problemas de permisos y de 2FA recién aparecen en una publicación real.

## Publicar a mano (primer release)

Si el token no puede publicar desde el CI (ver la sección siguiente), publicá las primeras versiones vos mismo desde un clon actualizado de `main`. npm te pide tu código de un solo uso en cada `publish`.

Antes de publicar a mano, asegurate de que cada kit resuelva `artisanform` a la raíz del repo (`ls packages/ui-*/node_modules/artisanform/package.json` debe listar un archivo; corré `bun install` si no) y corré `node scripts/consumer-test.mjs 19`: empaqueta los kits que vas a publicar y los tipa en una app limpia. Un kit construido donde `artisanform` no se resuelve publica tipos rotos (pasó en 0.3.0-beta.1).

```bash
git checkout main && git pull
bun install && bun run build && bun run build:kits
npm login                                              # tu usuario, con 2FA

npm publish --access public --tag beta --ignore-scripts
(cd packages/ui-bootstrap && npm publish --access public --tag beta)
(cd packages/ui-mui       && npm publish --access public --tag beta)
(cd packages/ui-tailwind  && npm publish --access public --tag beta)
(cd packages/ui-scss      && npm publish --access public --tag beta)
```

Después corré la verificación del paso 6 de arriba.

## Trusted Publishing (sin token)

npm puede confiar directamente en un workflow de GitHub (OIDC), así que **no hace falta `NPM_TOKEN`** y el provenance viene incluido. El workflow ya tiene `id-token: write`.

1. En npmjs.com, abrí cada uno de los cinco paquetes → **Settings → Trusted Publisher** y agregá GitHub Actions con el repositorio `mastoreto/artisanForm` y el workflow `release.yml`. Se hace por paquete y requiere que el paquete ya exista, por eso el primer release va con un token o a mano.
2. Sacá la línea `NODE_AUTH_TOKEN` del paso de publicación en `release.yml` y borrá el secreto `NPM_TOKEN`. Hace falta un npm CLI reciente (11.5.1 o superior al momento de escribir esto; Node 24 en el runner trae uno compatible).

## Resolución de problemas

| Qué ves | Causa y solución |
| --- | --- |
| `E403 Forbidden - PUT …/artisanform` | El token no puede escribir en ese paquete o scope. Usá un token granular con lectura y escritura sobre **todos los paquetes** (y la organización `beardartisans`), y verificá que tu usuario pueda publicar en la organización. |
| `EOTP: This operation requires a one-time password` | npm pide un código 2FA y el CI no puede escribirlo. Reactivá *Bypass two-factor authentication* en el token; si sigue pasando, npm ya no acepta tokens con bypass para publicar directo en tu cuenta (su log lo dice). Publicá las primeras versiones a mano y después pasá a Trusted Publishing. |
| `ENOENT … artisanform-<versión>.tgz` en `check:package` durante `npm publish --dry-run` | El `prepublishOnly` del núcleo corrió dentro de un dry run, donde `npm pack` no escribe el tarball. El workflow lo evita con `--ignore-scripts`; hacé lo mismo cuando hagas un dry run a mano. |
| `402 Payment Required … You must sign up for private packages` | Los paquetes con scope son privados por defecto, y los privados requieren un plan pago. Cada kit define `publishConfig.access: "public"`; mantenelo, y mantené `--access public`. |
| `You cannot publish over the previously published versions` | Esa versión ya existe. Subí la versión (también en los kits). Mirá qué paquetes llegaron con `curl https://registry.npmjs.org/<paquete>` antes de reintentar un release parcial. |
| `check:pack` informa una diferencia de versión | La `version` de un kit difiere de la del núcleo. Publicalos en lockstep. |
| `Cannot find name 'ArtisanUiKit'` en un proyecto que instaló un kit | El kit se construyó donde `artisanform` no se resolvía, así que su `.d.ts` no tiene el import. Arreglá el enlace (`bun install`), reconstruí, verificá con `node scripts/consumer-test.mjs 19` y publicá una versión nueva: una versión publicada no se puede corregir. |

Todo intento que llega a `--provenance`, aunque falle, deja una entrada firmada en el registro público de transparencia de Sigstore. Es inofensiva y no se puede borrar.
