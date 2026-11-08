# Releasing

> 🌐 Spanish version: [es/releasing.md](es/releasing.md)

How ArtisanForm is published to npm. Five packages ship together, all at the same version:

| Package | What it is |
| --- | --- |
| `artisanform` | The core library (unscoped) |
| `@beardartisans/ui-bootstrap` | Bootstrap 5 kit |
| `@beardartisans/ui-mui` | Material UI kit |
| `@beardartisans/ui-tailwind` | Tailwind CSS kit |
| `@beardartisans/ui-scss` | Sass theme (tokens mixin) |

`@beardartisans/ui-shadcn` is **private**: it is a copy-paste registry item, not an npm package.

## Branches and versions

- `develop` is integration; `main` is what gets released. Nobody commits to either directly: changes arrive through pull requests, and `develop` → `main` is only for releases.
- The kits peer on the core (`artisanform@^<version>`), so they are released **in lockstep**: same version number, published in this order: core, bootstrap, mui, tailwind, scss. `check:pack` fails if a kit version differs from the core's.
- Pre-releases use a `-beta.N` suffix and the `beta` dist-tag. The **very first** publish of a package also sets `latest` (npm does it when a package has no `latest` yet), so until the first stable release a plain `npm install artisanform` installs the beta; that is what happened with `0.3.0-beta.0`. Once a stable version is published with `--tag latest`, later `--tag beta` publishes leave `latest` alone. Install a beta explicitly with `npm install artisanform@beta`.

## One-time setup

1. **npm account with 2FA**, and an npm **organization** named `beardartisans` (the free plan is enough for public packages). The user who publishes must be a member with permission to publish.
2. A **granular access token**: read and write on *all packages* (the unscoped `artisanform` does not exist before its first release, so it cannot be picked individually), with *Bypass two-factor authentication* enabled. Save it as the repository secret `NPM_TOKEN` (Settings → Secrets and variables → Actions). Never paste it in an issue, a PR or a chat.
3. Read the `EOTP` row of [Troubleshooting](#troubleshooting): npm is restricting bypass tokens for direct publishing, so this token may not be enough on its own.

## Cutting a release

1. Make sure `develop` is green in CI and the changelog (`CHANGELOG.md` and `docs/es/CHANGELOG.md`) describes the release.
2. Set the new version in the root `package.json` **and** in the four kits (`packages/ui-*/package.json`), and update the kits' `peerDependencies.artisanform` range if the minor changed. Open a PR to `develop`.
3. Merge `develop` into `main` with a pull request.
4. In **Actions → Release → Run workflow**, choose the branch `main`, leave `tag` as `beta` (or the dist-tag you want) and keep **`dry-run` on**. Check that it is green.
5. Run it again with `dry-run` **off**. This publishes for real, and **it cannot be undone**: a published version number can never be reused.
6. Verify the result from the registry, with the real packages installed in a clean app:

   ```bash
   ARTISAN_SPEC=0.3.0-beta.0 node scripts/consumer-test.mjs 19
   ```

   It installs the core and the bootstrap, MUI and Tailwind kits from npm, typechecks them against the `kit` prop and builds a clean Vite app (use `18` instead of `19` for React 18).

## What the `Release` workflow does

`.github/workflows/release.yml` is manual (`workflow_dispatch`) with two inputs, `tag` and `dry-run` (default **true**). It runs, in this order: lint, typecheck, build, build of the kits, typecheck of the kits, `check:dist`, `check:package` (publint and attw), `check:kits`, `check:pack` and the unit tests. Only then does it run `npm publish --provenance --access public --tag <tag> --ignore-scripts` in each package.

- **A real publish is refused unless the workflow runs from `main`.** A dry run works from any branch.
- `--ignore-scripts` is deliberate: every check already ran in the steps above, and the core's `prepublishOnly` would repeat them (under `--dry-run` its nested `npm pack` writes no tarball, which breaks `attw --pack`).
- `--provenance` links each package on npm to the exact commit and workflow that built it. It only works from a supported CI such as GitHub Actions, so manual publishes do not carry it.
- A dry run proves the build and the tarballs, **not the credentials**: permission and 2FA problems only show up in a real publish.

## Publishing by hand (first release)

If the token cannot publish from CI (see the next section), publish the first versions yourself from an up-to-date clone of `main`. npm asks for your one-time code on every `publish`.

```bash
git checkout main && git pull
bun install && bun run build && bun run build:kits
npm login                                              # your user, with 2FA

npm publish --access public --tag beta --ignore-scripts
(cd packages/ui-bootstrap && npm publish --access public --tag beta)
(cd packages/ui-mui       && npm publish --access public --tag beta)
(cd packages/ui-tailwind  && npm publish --access public --tag beta)
(cd packages/ui-scss      && npm publish --access public --tag beta)
```

Then run the verification from step 6 above.

## Trusted Publishing (no token)

npm can trust a GitHub workflow directly (OIDC), so **no `NPM_TOKEN` is needed** and provenance comes for free. The workflow already has `id-token: write`.

1. On npmjs.com, open each of the five packages → **Settings → Trusted Publisher** and add GitHub Actions with repository `mastoreto/artisanForm` and workflow `release.yml`. This is done per package and needs the package to exist, which is why the first release goes through a token or by hand.
2. Remove the `NODE_AUTH_TOKEN` line from the publish step in `release.yml` and delete the `NPM_TOKEN` secret. A recent npm CLI is required (11.5.1 or newer at the time of writing; Node 24 on the runner ships a compatible one).

## Troubleshooting

| What you see | Cause and fix |
| --- | --- |
| `E403 Forbidden - PUT …/artisanform` | The token cannot write to that package or scope. Use a granular token with read and write on **all packages** (and the `beardartisans` organization), and check that your user can publish in the organization. |
| `EOTP: This operation requires a one-time password` | npm wants a 2FA code and CI cannot type one. Re-enable *Bypass two-factor authentication* on the token; if it still happens, npm no longer accepts bypass tokens for direct publishing on your account (its log says so). Publish the first versions by hand, then switch to Trusted Publishing. |
| `ENOENT … artisanform-<version>.tgz` in `check:package` during `npm publish --dry-run` | The core's `prepublishOnly` ran inside a dry run, where `npm pack` writes no tarball. The workflow avoids it with `--ignore-scripts`; do the same when you dry-run by hand. |
| `402 Payment Required … You must sign up for private packages` | Scoped packages are private by default, and private ones need a paid plan. Every kit sets `publishConfig.access: "public"`; keep it, and keep `--access public`. |
| `You cannot publish over the previously published versions` | That version already exists. Bump the version (also in the kits). Check which packages made it with `curl https://registry.npmjs.org/<package>` before retrying a partial release. |
| `check:pack` reports a version mismatch | A kit's `version` differs from the core's. Release them in lockstep. |

Every attempt that reaches `--provenance`, even a failed one, leaves a signed entry in the public Sigstore transparency log. It is harmless and cannot be deleted.
