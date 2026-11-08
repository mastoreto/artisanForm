# Changelog

Spanish version: [docs/es/CHANGELOG.md](docs/es/CHANGELOG.md).

## Unreleased (Documentation)

- **New guides** (English in `docs/`, Spanish in `docs/es/`): [payments](docs/payments.md) (the security principle, flows, a production checklist), [files and storage](docs/files.md), [accessibility and tested environments](docs/accessibility.md) (what is built in, what axe checks, what is not verified yet, browsers/React/Node covered by CI) and [releasing](docs/releasing.md) (the five packages, the `Release` workflow, publishing by hand, Trusted Publishing and a troubleshooting table with the npm errors seen in the first release).
- **README and AGENTS.md:** beta status, install with `@beta` and the `@beardartisans/ui-*` kits, a documentation index, and an updated "Project status".
- **Docs site:** the Starlight site (en/es) now includes all the guides and a link to Storybook, with sibling links rewritten so they work under the `/artisanForm/` base path. The new `Docs` workflow publishes the site and Storybook to GitHub Pages on every push to `main` (enable it once under Settings → Pages → Source: GitHub Actions). CI also builds Storybook.

## Unreleased (First beta: 0.3.0-beta.0)

- **Version:** `0.3.0-beta.0` for the core **and** the four npm kits (`@beardartisans/ui-bootstrap`, `ui-mui`, `ui-tailwind`, `ui-scss`), published together in lockstep; they peer on `artisanform@^0.3.0-beta.0`. Each kit now has its own `README`, `LICENSE`, repository metadata and `publishConfig.access: public` (required for scoped packages). `ui-shadcn` stays private (a copy-paste registry item).
- **Scope and branches:** the kits are published under the npm organization `@beardartisans` (`@beardartisans/ui-bootstrap`, `ui-mui`, `ui-tailwind`, `ui-scss`); the core stays `artisanform` (unscoped). The release branch is now `main` (was `master`): CI and the docs follow it, and the `Release` workflow refuses a real publish from any other branch (a dry run works anywhere).
- **Accessibility fix found by the new axe suite:** the default primary color was `#3b82f6` (3.68:1 against the white button text, below WCAG AA); it is now `#2563eb` (5.17:1), in `artisanform.css` and in the Sass kit. Override `--artisan-primary` as before.
- **Tests:** `e2e/a11y.spec.ts` runs axe-core (WCAG 2.0/2.1 A and AA) on the wizard (also with validation errors shown), fields, repeatables, layout and files. Playwright now has `chromium`, `firefox` and `webkit` projects: locally only Chromium runs; set `ARTISAN_BROWSERS=chromium,firefox,webkit` to run all. CI adds an `e2e-browsers` job for Firefox and WebKit.
- **Packaging:** `bun run check:pack` verifies the tarball of the core and of every kit (only the built output, `LICENSE`, `README.md`, `package.json`; no sources, tests or stories; kit versions equal to the core's) and runs in CI and in `prepublishOnly`. The consumer test also installs the bootstrap, mui and tailwind kits and typechecks them against the `kit` prop.
- **Release:** a manual `Release` workflow (`workflow_dispatch`) runs every check and then publishes the core and the kits with `npm publish --provenance --tag <tag>`. It needs the `NPM_TOKEN` repository secret (a granular token with read/write on all packages, covering `artisanform` and the `@beardartisans` organization) and is a dry run unless `dry-run` is turned off. After publishing, verify the registry packages with `ARTISAN_SPEC=<version> node scripts/consumer-test.mjs 19`.

## Unreleased (Release prep)

- **Package metadata:** `license` (MIT, plus a `LICENSE` file), `description`, `keywords`, `repository`, `homepage`, `bugs`, `engines` (Node >= 20.19), `publishConfig.access` and a `prepublishOnly` guard (build + `check:dist` + `check:package` + tests).
- **Bun everywhere:** README, docs, Playwright and scripts no longer reference pnpm for contributor commands; consumer installs are documented with `npm install`, and the consumer test scripts use `npm` (always available in CI).
- **Lint:** `react-hooks/exhaustive-deps` is off for the payment providers, whose effects run once on mount by design (a re-run would create a second payment). Configured in `eslint.config.js` because the React Compiler skips components with `eslint-disable` comments.

## Unreleased (Phase 5: UI kits)

- **`kit` prop:** an `ArtisanUiKit` (`components`, `classNames`, `unstyled`, `labels`) with `defineUiKit` / `mergeUiKits`. Precedence: default UI < kit < explicit props. Guide: [docs/ui.md](docs/ui.md).
- **Workspace packages:** `@beardartisans/ui-bootstrap`, `@beardartisans/ui-mui`, `@beardartisans/ui-tailwind`, `@beardartisans/ui-scss` and a shadcn registry item (`packages/ui-shadcn`). The core does not depend on any of them.
- **Accessibility fix found by the new conformance suite:** the native `select` label is now a real `<label for>` and the select sets `id` and `aria-invalid`.

## Unreleased (Phase 4: modern stack)

- **Stack:** React 19 (peer range `^18.3.1 || ^19.0.0`, both tested), Vite 8, TypeScript 6, Storybook 10, `@vitejs/plugin-react` 6, ESLint 10 with the React Hooks / Compiler rules (`bun run lint:react`). Tailwind stays on 3 (only the playground and Storybook use it). Removed unused `sass-embedded`, `ts-node` and `vite-tsconfig-paths`.
- **React Compiler (Rust):** the library is compiled with `oxc-transform-react` (`react-compiler.ts`, `target: '18'`), so consumers need no configuration. `react-compiler-runtime` is a dependency and stays external. `ARTISAN_COMPILER=off` disables it. Fixes found by the compiler: refs and mutable reads during render (`useArtisanForm`, `useArtisanField`, `Combobox`, `PaymentStep`), stale memo dependencies in `ArtisanForm`. `useWizard` opts out on purpose (`getValues()` during render).
- **Breaking (packaging):** ESM only; files are `dist/index.js` and `dist/payments/<name>.js`; `main`/CJS removed; `.d.ts` use explicit `.js` specifiers (Node16/NodeNext ready); `Controls` no longer references the global `JSX` namespace; source maps are shipped.
- **Verification:** `bun run check:dist` (compiled output, declared imports, no bundled React), `bun run check:package` (`publint`, `attw`), consumer tests with the packed tarball in clean Vite apps on React 18 and 19 (+ SSR + browser), CI runs e2e with the compiler on and off on Node 22/24.

## Unreleased (Phase 3: extensible UI)

- **Hybrid rendering:** the engine, the renderer and the UI components are separate. New `ArtisanForm` props: `components` (replace inputs by field `type`, `Stepper`, `Controls`, `FieldWrapper`, `StepHeader`, `FormError`), `classNames` (extra classes per part) and `unstyled`. Replacement inputs receive a neutral `ArtisanInputProps` contract (no React Hook Form or Zustand). Full guide: [docs/ui.md](docs/ui.md).
- **Styles are no longer tied to Tailwind:** the default UI is plain CSS (`af-*` classes, `--artisan-*` variables, state through `data-*`/`aria-*`), without Tailwind classes or a global reset. **Breaking:** `artisanform/style.css` no longer ships Tailwind's preflight, `commons/theme.ts` is gone and `cn()` is a thin `clsx` wrapper (`tailwind-merge` removed).
- **Semantic `ui` is interpreted:** form `density` and `labelPosition` (and the `data-layout` hook), step `columns`, field `span` (legacy `width` still maps to it); `variant` reaches custom components as `field.uiVariant`.
- **Custom steps:** new stable `ArtisanStepApi` (`ctx.api`): owned writes only, errors, `next()`/`back()` through the engine's rules. `goTo`/`submit` on `StepContext` remain but are not recommended.
- Registries fail early with the type name when an entry is incomplete. `useWizard` (internal) now holds all the wizard behavior; `Wizard` only renders.
- New playground scenarios: semantic layout, custom components, extensions with a JSON schema, and three ways to style.

## Phase 2: React Hook Form

- **Engine:** values, registration, validation and field arrays now run on React Hook Form (one `useForm` per wizard, Yup through `@hookform/resolvers`). Formik is gone. The v1 contract, Yup rules, Zustand step state, payments, storage and waits are unchanged.
- **Breaking (install):** `react-hook-form` is now a peer dependency (replaces `formik`). Standalone inputs go inside the new `StandaloneForm` (instead of `<Formik>`); no React Hook Form import needed. The wizard re-renders only on changes to values that conditions read, so typing re-renders just the typed field.
- Validation runs on change; errors show once the field is touched or "Next" was tried (as before). `trigger` validates only the step's fields.
- Repeatable fields use `useFieldArray` with stable row ids.
- A step that stops being visible while active moves the wizard to the same position (clamped); a second "Next" while `beforeNext` runs, or a stale `beforeNext` result, no longer navigates twice; drafts skip identical writes.

## Phase 1: schema contract v1

- **`ArtisanSchemaV1`**: a public, JSON-serializable, versioned contract (`schemaVersion`, `id`, `revision`) with fields and steps discriminated by `type`, stable step ids and semantic UI configuration. `defineForm` helper to write it in TypeScript.
- **Declarative conditions** (`visibleWhen`): `eq neq gt gte lt lte in notIn filled empty` + `all`/`any`/`not`, with no code execution. 0.2.0 `showIf` is translated with `coerce: "string"` and was verified equivalent to the previous implementation.
- **`parseArtisanSchema`**: manual, dependency-free structural validation with readable `issues` (`code`, `path`) and a `SchemaPolicy` for remote schemas.
- **`normalizeArtisanSchema`**: a single internal representation (deterministic and idempotent). 0.2.0 adapter: `kind`→`type`, `showIf`→`visibleWhen`, `width`→`ui.span`, `helperText`→`description`, derived ids, functions extracted into *bindings*.
- **`extensions`** (`options`, `waits`, `hooks`, `renderers`, `actions`): a schema refers by id to what is local code.
- **Draft snapshots** (`ArtisanSnapshotV1`): step by id, `formId`/`formRevision`, incompatibility detection with `onSnapshotConflict` (default: back up and start clean), restoration of 0.2.0 drafts and always-JSON values.
- **Compatibility**: `FormSchema`/`FieldSchema`/`StepSchema` are `@deprecated` but keep working; no export was removed. A 0.2.0 form and its v1 equivalent render the same HTML.
- Documentation: [docs/schema-v1.md](docs/schema-v1.md).
- Source reorganized by layers (`schema/{contract,legacy}`, `engine/`, `components/{ArtisanForm,Controls,inputs,fields,steps}`, `integrations/{payments,storage,wait}`, tests in `__tests__/`). The public API and package subpaths are unchanged; only the `types` entries of the `artisanform/payments/*` exports point to the new declaration files.
- **Breaking:** default UI texts (`defaultLabels`) are now English; pass `labels` for another language. All internal code, tests, fixtures, demos and stories are English too; labels, names and titles in a schema stay free text.
- Documentation language: everything is now written in English; Spanish versions live in [docs/es/](docs/es/).

## 0.2.0 (unreleased)

- **New fields:** `checkbox`, `switch`, `tel`, `url`, `time`, `datetime`, `month`, `daterange`, `range`, `rating`, `otp`, `combobox`, `multiselect`, `array` (repeatable rows), `file`/`image`, and content fields (`heading`, `paragraph`, `callout`, `divider`). Masks, `prefix`/`suffix`, native attributes and `width: 'half'`.
- **Extensible registries:** `fields` (custom field types) and `stepTypes` (custom step types).
- **Special steps:** `terms`, `payment`, `pending`, `review`, `result` and `custom`; `beforeNext`/`onEnter`/`controls` hooks; submit state with retry.
- **Files:** `StorageAdapter` with `presignedPut` (S3/R2/Backblaze) and `cloudinary`; progress, cancel, retry, previews, drag and drop.
- **Payments:** `PaymentPlugin` (embedded and redirect, idempotency, resume) with Stripe, Lemon Squeezy, Mercado Pago and PayPal plugins in `artisanform/payments/*` (SDKs as optional peers).
- **Waiting:** `WaitStrategy` with `polling`, `sse`, `websocket` and `callback`.
- **Tooling:** Biome replaces Prettier; playground with `bun run playground`; e2e tests with Playwright.

## 0.1.0 (unreleased)

First release candidate.

- `ArtisanForm`: a `scheme`-driven wizard with per-step validation (Formik + Yup).
- Inputs: Text (text/email/number), Textarea, Password, Date, Select, DynamicSelect (fixed map or async), Check, Radio.
- Scheme: `required`, `min`, `max`, `pattern`, `defaultValue`, `disabled`, `helperText`, `sameAs`, `showIf` (fields and steps).
- API: `initialValues`, `onChange`, `onStepChange`, `step`, `persistKey` (draft in localStorage), `labels`, `className`.
- Per-instance step state (several forms per page).
- Accessibility: progress indicator, focus on the first error, ARIA roles on groups.
- Styles: precompiled `artisanform/style.css` or your own Tailwind; brand color through CSS variables.
- ES + CJS package with `peerDependencies` (`react`, `react-dom`, `formik`, `yup`, `zustand`).
