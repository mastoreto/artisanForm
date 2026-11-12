# Changelog

Spanish version: [docs/es/CHANGELOG.md](docs/es/CHANGELOG.md).

## 0.3.0-beta.2 (2026-11-12)

Republish of 0.3.0-beta.1 with the packaging fixed. **Do not use the kits of 0.3.0-beta.1; use this version.** The core library has no code changes.

### Fixes

- **Kit typings (`@beardartisans/ui-bootstrap`, `ui-mui`, `ui-tailwind`):** the `.d.ts` published in 0.3.0-beta.1 exported `ArtisanUiKit` without importing it, so `tsc` failed in any project that installed the kits (`Cannot find name 'ArtisanUiKit'`). The kits were built on a machine where `artisanform` did not resolve inside `packages/*`; CI builds were fine. See the note in [releasing](docs/releasing.md).
- **`@beardartisans/ui-tailwind`:** 0.3.0-beta.1 shipped the 0.3.0-beta.0 code; this is the first release with the kit updates listed under 0.3.0-beta.1 (every part styled, new look).
- **`@beardartisans/ui-bootstrap`:** 0.3.0-beta.1 had no `dist/style.css`, so `@beardartisans/ui-bootstrap/style.css` did not resolve; restored.

## 0.3.0-beta.1 (2026-11-10)

Second beta. Highlights: the public headless API (`useArtisanWizard`, `artisanform/headless`), typed form values (`InferValues`), declarative transitions with bounded loops and revisit rules, `wait` timeout/retry/cancel, pluggable and migratable drafts, a dark theme and a `StatusPanel` slot, and the payment return URL being untrusted in the core. **Behavior changes to read before upgrading:** redirect payments report `processing`, never `succeeded` (AF78, AF86), and `parseArtisanSchema` rejects unsafe `href` values and dangerous field names (AF76).

### Persistence

- **Pluggable drafts, debounce and migrations (AF92):** `draftStorage` (any synchronous `getItem`/`setItem`/`removeItem` store), `draftDebounceMs` (writes also happen on step change and unmount, never after a successful submit) and `snapshotMigrations` (a chain of functions that bring a draft saved against an older `revision` up to the current one; failures fall back to `onSnapshotConflict`, and the original is kept in the backup slot). The IO helpers (`readSnapshot`, `writeSnapshot`, `clearSnapshot`, `readRaw`, `backupStored`) and `migrateSnapshot` are exported. Not included: asynchronous storage.

### Waiting

- **`wait` options (AF91, decision: no separate `action` step):** `timeoutMs`, `retry: { max, backoffMs? }` and `cancellable` on `wait` steps (and on 0.2.0 `pending` steps). New default labels `waitTimeout` and `cancel`. The parser validates them (`timeoutMs` 1–3 600 000, `retry.max` 1–10, `backoffMs` 0–60 000).

### Workflows

- **Transitions (AF90):** steps accept `next: { when?, to }[]` (first matching edge decides the next step), `loop: { max }` (bounds re-entries; required on the target of a way back) and `revisit: 'allow' | 'deny'` (a finished `deny` step cannot be returned to). Back follows the path taken; the path is saved in the draft (`history?` in the snapshot, still `snapshotVersion` 1) so a reload resumes on the branch. The parser reports `unbounded-loop` (error) and `unreachable-step` (warning). Schemas without these properties behave exactly as before. `useArtisanWizard` adds `canGoBack` and guards `goTo`/`goToStep` with the revisit rule. See [schema v1](docs/schema-v1.md#transitions-loops-and-revisit-).

### Personalization

- **`components.StatusPanel` (AF89):** the screen of the payment, waiting and result steps can be replaced (`ArtisanStatusPanelProps`).
- **Stepper navigation:** `<ArtisanForm stepperNavigation>` makes finished steps clickable (`ArtisanStepperProps.onSelect`; off by default).
- **Theme, motion, focus:** `theme="dark" | "auto"` redefines the color tokens (opt-in; nothing changes without it), `prefers-reduced-motion` turns transitions off, and more interactive parts show a `:focus-visible` outline. New `stepperButton` class slot.
- **Not in this change:** `layout: 'horizontal'` styling and a uniform contract for multi-value inputs (`array`, `file`, `dynamicSelect`, `daterange`) are still pending.

### Typed values and navigation by id

- **`InferValues` and typed `onSubmit` (AF88):** `defineForm` now keeps the literal type of the schema (a `const` generic; the same object comes back), and `InferValues<typeof schema>` computes the submitted values from it. `ArtisanForm` and `useArtisanWizard` are generic over the schema and type `onSubmit` with it; a schema that is not a literal (or a 0.2.0 `FormSchema`) still gets `Record<string, unknown>`.
- **Navigation by id:** `wizard.goToStep(id)`, the `stepId` / `onStepIdChange` options and `ArtisanStepApi.goToStep(id)`. The index API is unchanged. Typed props for custom step types (`StepDefinition<P>`) are not part of this change.

### Headless

- **`useArtisanWizard` (AF87):** the wizard's behavior is now a public hook (see [docs/headless.md](docs/headless.md)), exported from `artisanform` and from the new `artisanform/headless` entry (no stylesheet). It returns the React Hook Form instance, the visible steps, the current step, `next/back/goTo/submit`, the submit state and what the default renderer needs; `ArtisanWizardProvider` and `useArtisanField` bind your inputs. `ArtisanForm` is now a thin consumer of this hook, and `Wizard` only renders what it returns. The internal `useArtisanForm` was renamed `useFormBinding`. `useWizard` takes the form, the store and the UI state as parameters instead of reading them from context. No behavior change for `ArtisanForm` users.

### Security: payments in the core

- **Untrusted return URL, enforced in the core (AF86, behavior change for custom plugins):** `PaymentStep` now downgrades any `resume()` result from `succeeded` to `processing`, not only the bundled plugins. `PaymentRequest.signal` is aborted when the payment step unmounts (it never was). `parseArtisanSchema` emits the warning `payment-without-confirmation` when a `payment` step is not followed by a `wait` step. **If a custom plugin read a success from the URL and relied on it, add a `pending` step that confirms the payment on your backend.**

### Fixes

- **`failTo` with hidden steps (AF85):** a `wait` step's `failTo` was projected to an index in the full step list but used as an index among the visible steps, so a hidden step before the target sent the user to the wrong step. It stays a step id now and is resolved against the visible steps when the wait fails (a hidden target falls back to going back one step).
- **Duplicate label with a `FieldWrapper`:** a replaced `select`, `radio` or `check` inside a `FieldWrapper` printed its label twice (the step added a group label on top of the wrapper's). The wrapper now owns the label and help of the inputs the kit replaces.

### UI kits

- **`@beardartisans/ui-tailwind`:** the kit now styles every part (switch, rating stars, OTP, files, status screen, review, terms…), which were unstyled before; new emerald/slate look with underlined step tabs.
- **`@beardartisans/ui-bootstrap`:** the stepper shows the current and finished steps (`data-state`) and the rating stars are styled.

### Payments

- **Mercado Pago brick:** `brick.preferenceId` can be a function that asks your backend to create the preference (same `back_urls` as `createPreference`) and returns its `id`, which enables the Mercado Pago account login inside the Brick.

### Tests

- **Characterization tests (AF84):** the projection (`engine/project.ts`), the step store and the draft (`engine/draft.ts`) now have their own tests, and the layer-isolation test also rejects relative imports of `engine/`, `components/`, `integrations/` and `styles/` from `schema/` and `persistence/`, plus `import()`, `require()` and side-effect imports of React, React Hook Form, Yup and Zustand. The three lint warnings are gone and the unknown-step fallback goes through `cx` (so `unstyled` and `classNames` apply).

### Planning

- **Evolution plan (AF83):** [docs/planning/artisanform-evolution.md](docs/planning/artisanform-evolution.md) audits the current state and plans the headless API (`useArtisanWizard`), typed values, workflows and snapshot migrations, with the decisions taken. AGENTS.md lists `apps/docs`, and the docs call the future headless hook `useArtisanWizard`.

### Robustness

- **Integrations (AF77):** a `wait` message with an unknown `status` now fails the step instead of waiting for the timeout, and a `websocket()` that closes before a final status fails (closing it ourselves is not a failure). `cloudinary()` throws a clear upload error when the response is not the expected JSON. The payment idempotency key uses `crypto.getRandomValues` when `randomUUID` is unavailable (insecure contexts) instead of `Math.random`, and fails if there is no `crypto` at all. The files guide states that `accept` and `maxSize` are not a security control.

### Security

- **Schema hardening (AF76):** `parseArtisanSchema` rejects a `href` that is not `http:`, `https:`, `mailto:` or relative (`unsafe-url`, so `javascript:` links are refused) and field names that are prototype keys or use path syntax (`invalid-name`). The renderer also skips an unsafe `href`, which covers 0.2.0 schemas. Schemas that used those values now fail validation.

### Security: behavior change

- **Payment return URL is no longer trusted (AF78):** `resume()` of the redirect plugins (Stripe, Mercado Pago, Lemon Squeezy and the mock) now reports `processing` where it used to report `succeeded`, because anyone could forge `?stripe_status=success` and make the wizard record a paid step. Embedded flows (`render` → `onResult`) are unchanged. **If you rely on a redirect checkout, add a `pending` step after the payment step so your backend confirms the payment**; the `payment` value in the submitted payload must never be treated as proof of payment.

### Documentation

- **New guides** (English in `docs/`, Spanish in `docs/es/`): [payments](docs/payments.md) (the security principle, flows, a production checklist), [files and storage](docs/files.md), [accessibility and tested environments](docs/accessibility.md) (what is built in, what axe checks, what is not verified yet, browsers/React/Node covered by CI) and [releasing](docs/releasing.md) (the five packages, the `Release` workflow, publishing by hand, Trusted Publishing and a troubleshooting table with the npm errors seen in the first release).
- **README and AGENTS.md:** beta status, install with `@beta` and the `@beardartisans/ui-*` kits, a documentation index, and an updated "Project status".
- **Docs site:** the Starlight site (en/es) now includes all the guides, with links between guides rewritten so they work at any base path. It is deployed with Vercel (project root `apps/docs`). CI also builds Storybook, which is not hosted anywhere; run it with `bun run storybook`.
- **Release guide:** documents that the first publish of a package also sets the `latest` tag, so until a stable release `npm install artisanform` installs the beta.

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
