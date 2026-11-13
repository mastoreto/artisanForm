# Changelog

Spanish version: [docs/es/CHANGELOG.md](docs/es/CHANGELOG.md).

## Unreleased

### Added

- **The builder's interface.** `<FormBuilder>` is a palette of inputs, a canvas with the steps and their fields, an inspector and a live preview, and gives back a v1 schema on every change (`onChange({ schema, ok, issues })`, `onSave({ …, hash })`). Drag an input from the palette (or click it) and reorder with the mouse, touch or the keyboard (Space to pick up, arrows, Space to drop); every row also has move up and down, duplicate, remove and move-to-step buttons. The inspector is generated from the catalog, so each input shows only what its type accepts; `mode="simple"` hides advanced and developer settings and inputs, and `policy` limits the inputs on offer. The preview is the real `<ArtisanForm>` (phone, tablet and desktop widths, light and dark). Controlled (`value`) or not (`defaultValue`), `readOnly`, `features` to turn parts off, and every text overridable through `labels`. The parts (`Palette`, `Canvas`, `Inspector`, `Preview`, `Toolbar`) and the `useFormBuilder` hook can be composed into your own layout. Import `artisanform/builder.css` (a separate stylesheet) and `artisanform/style.css`. Drag and drop uses `@dnd-kit/core` and `@dnd-kit/sortable`, optional peers: install them to use the builder.
- **Builder: problems, compatibility and custom types.** A collapsible panel lists every error and warning of the schema (live `checkSchema`, against your `manifest` or `registrations`, `policy` and `limits`) and each one jumps to the element it is about. With `baseline` (the published schema) the builder compares every edit with it (`compareSchemas`) and warns when a change would make earlier answers unreadable (a question that changed type), or when questions were removed, made required or lost options. Custom `x-…` types registered in the manifest appear in the palette (limited by `policy.fieldTypes`) and their settings are generated from the `ConfigShape` of their spec (numbers with their range, enums as dropdowns, switches, text; a type without a spec gets its config as JSON); a new custom field starts with a config that already passes its spec. New model functions `addCustomField`, `customFieldProperties` and `defaultConfig`.
- **Builder: conditions and flow without JSON.** The inspector edits `visibleWhen` with a visual condition editor: pick an earlier answer (never the field itself or a later one), a comparison that fits its type (greater than, at least… for numbers and dates; one of for lists; yes/no for switches) and a value typed by the answer (a dropdown for choices, a number for numbers), group them with all or any, nest groups and negate with Not. A step's next steps (`next`) are edited the same way, with a condition per transition, and a result step's buttons (text, link or a registered action) have their own editor. A flow overview lists where each step leads, with the parser's flow warnings (`unreachable-step`, `unbounded-loop`, `payment-without-confirmation`) next to the step they are about. Turn the editors off with `features.conditions`. New pure model functions `answerInfo`, `operatorsFor`, `toTree` and `fromTree` (the editable tree and the condition convert both ways, tested for every shape).
- **Builder: JSON, templates and translations.** Three panels open from the toolbar (each can be turned off with `features`). **JSON** shows the schema, applies an edited or pasted one, loads a file and downloads it; a schema from the 0.2.0 format is converted and a note says what was not carried over exactly, and a schema that cannot be opened is refused with the reasons. **Templates** is a gallery of starter forms (blank, contact, event registration, satisfaction survey, job application; pass your own with `templates`), and replacing a form that already has content asks twice. **Translations** manages the `i18n` block: add a language (a tag such as `es-AR`), set the form's own language, translate every text of the form with its state (missing, placeholders that do not match, plural forms), see translations that point at a text that no longer exists, and preview the form in a language. New pure model functions `addLocale`, `removeLocale`, `setMessage`, `setSourceLocale` and `translationRows`, and `defaultTemplates`.
- **`artisanform/builder` (first part: the model).** The foundation of a visual form builder, with no React: immutable operations over a v1 schema (`addField`, `removeField`, `moveField` across steps and into the rows of an `array`, `duplicateField`, `renameField`, the same for steps, and `setProperty` on a dotted path), names and ids that stay unique (implicit names such as `${name}End` and `termsAccepted` included), references that follow a rename or are pruned on removal, undo and redo with merging of typing bursts, and `pathToSelection` to jump from an issue path to the element. `FIELD_CATALOG` and `STEP_CATALOG` describe every native type for a palette, and `fieldProperties` / `stepProperties` list the properties an inspector edits. A new field or step type in the contract is a compile error until the catalog and the inspector decide how to handle it, and a test fails if a contract key is left uncovered. The operations keep a schema valid by construction: tested with random sequences of operations (seeded) that must pass `checkSchema` after every step. The entry is optional: it has its own size budget and does not grow the rest of the package.

## 1.0.0-rc.4 (2026-11-13)

Replaces `1.0.0-rc.3`, which was published with an old build (no `artisanform/schema.json`, none of the new `artisanform/schema` functions, and a CLI that could not run). rc.4 is the same source as rc.3, built correctly; rc.3's contents are listed under its own heading. Do not use rc.3.

### Fixed

- A stale build can no longer be published by hand: each kit has a `prepublishOnly` that runs the prepublish check (links, freshness of `dist`, typings), and the documented manual publish no longer skips the core's `prepublishOnly`.
- The `artisanform` CLI was lost when publishing: with `"bin": {"artisanform": "./bin/artisanform.mjs"}` npm 11 drops the entry ("script name … was invalid and removed"). The path is now `bin/artisanform.mjs`, and `check:pack` fails when `npm publish --dry-run` would correct anything in a `package.json`; `verify-registry` also checks that the published package has its `bin`.

### Added

- `scripts/verify-registry.mjs`: downloads the five packages of a version from npm and checks their files and that `artisanform/schema` declares every export of the API snapshot. The `Release` workflow runs it after a real publish (retrying while npm propagates).

## 1.0.0-rc.3 (2026-11-13)

Third release candidate: backend tooling. It adds the `sensitive` field flag (a contract addition), `checkSchema` and its companions in `artisanform/schema`, a form that no longer throws on a schema it cannot run, `artisanform/schema.json`, the `artisanform` CLI and the [backend guide](docs/backend.md). Everything is additive except the behavior changes listed under "Changed".

### Changed

- **`<ArtisanForm>` no longer throws on a schema that cannot run.** Before, an invalid schema or a name nobody registered threw during render and, without an error boundary in the app, left the page blank. Now the form runs the schema through the same gate as `checkSchema` first and, when something stops it, shows a short message instead (`labels.schemaErrorMessage`, translatable; in development it also lists each error with its code and path, controlled by `showSchemaIssues`). Everything is reported through the new `onSchemaIssues(issues)` prop, errors and warnings alike, once per distinct set. A custom `fallback` (node or function of the issues) replaces the message. The headless `useArtisanWizard` returns `schemaIssues` and `schemaBlocked`. A blocked form never reads or touches a saved draft.
  - What stops the form (error): an invalid schema, a missing hook, wait strategy, renderer, action or payment provider, an unregistered step type, an invalid `config` of a custom type. A missing payment provider is now reported before the user fills anything, not when the payment step is reached.
  - What only degrades (warning): a missing options source (the field shows no options; before, it blocked the form), a missing storage adapter, an unregistered custom field (it shows its own notice), lint findings, and anything found in a 0.2.0 schema, which never blocks.
  - `normalizeArtisanSchema` still throws `ArtisanSchemaError` (its contract); only the form stopped throwing.
- `Unknown field type` / `Unknown step kind` come from `labels` (`unknownFieldType`, `unknownStepKind`) instead of being fixed English.
- With a `SchemaPolicy` object, a `storage` id that the policy does not list is now a `policy-violation` (before, any adapter id passed). Add `storage: [...]` to the policy to allow the ones you provide. Trusted schemas are unaffected.

### Added

- **Backend helpers in `artisanform/schema`:** `answerFields(schema)`, `answerKeys(field)` and `sensitiveAnswerKeys(schema)` list the questions a schema asks, the keys a field writes (a date range and a dynamic select write two) and the keys flagged sensitive. Pure functions, no React.
- **`sensitive?: boolean` on fields:** a marker for personal or confidential answers. The library only carries it; who may read those answers is the backend's decision.
- **`SchemaPolicy.nativeFieldTypes` / `nativeStepTypes`:** restrict which native field and step types a schema source may use (violations are `policy-violation`).
- **`SchemaPolicy.storage`:** the storage adapter ids a `file`/`image` field may name.
- **`ParseOptions.limits`** (`maxBytes`, `maxSteps`, `maxFields`, `maxOptions`): ceilings for schemas that come from outside. None applies unless set. Codes: `too-large`, `too-many-steps`, `too-many-fields`, `too-many-options`.
- **`validateValues` option `maxItems`** (default 1000): a cap on the rows of an `array`, the choices of a `check`/`multiselect` and the files of an upload, checked before the list is walked.
- **`$schema`** is accepted as an optional string at the root of a schema (editor completion).

- **`checkSchema(input, { policy, limits, manifest, lint })`:** one pure gate for a schema. It parses (contract, policy, limits), lints, and checks the schema against what the front end can run, and never throws. Use it where a schema enters or leaves a system: saving or publishing in a backend, CI, or the form about to render it. Errors and warnings share one issue shape, and what stops a form (a missing hook, wait strategy, renderer, action or payment provider, a bad custom `config`) is an error while what only degrades one element (a missing options source or storage adapter, an unregistered custom field) is a warning (`capabilitySeverity`).
- **Verifiable custom types:** `CustomTypeSpec` and `ConfigShape` (a tiny declarative subset of JSON Schema) describe the `config` of a custom `x-…` field or step as plain data. It travels in the capabilities manifest (`CapabilitiesManifest.customTypes`), so `checkCapabilities` reports `invalid-config` with the exact path without running the app's code. `validateConfig` is exported.
- **`describeRegistrations({ extensions, fields, stepTypes, plugins, storage })`:** derives the capabilities manifest from the same props passed to `<ArtisanForm>`, instead of four lists kept by hand. `FieldDefinition` and `StepDefinition` take an optional `spec`.
- **`lintSchema(schema)`:** semantic warnings (`forward-field-reference`, `default-not-an-option`, `duplicate-option`).
- **`canonicalize(value)` and `schemaHash(value)`:** stable JSON text (sorted keys) and its SHA-256 (hex): an ETag, the identity of a revision, change detection.
- **`compareSchemas(previous, next)`:** what changed between two revisions (added, removed, changed type, required, dropped options) and whether answers given to the previous one keep their meaning (`compatible`).
- **`artisanform/schema.json`:** the JSON Schema (draft 2020-12) of the v1 contract, built from the library's own key lists. It describes the structure (types, known keys, enums, required properties), so any language, or a database that validates JSON, can check a schema without Node. Use it from a schema's `$schema` for editor completion. It does not replace `parseArtisanSchema` / `checkSchema`: unique names and ids, references between fields and steps, the flow, policy, limits and capabilities need the whole document. Parity with the parser is tested with every golden fixture.
- **Backend guide** ([docs/backend.md](docs/backend.md)): the save, publish, serve and receive flow with `checkSchema`, `compareSchemas`, `schemaHash` and `validateValues`; storage models (a JSON document per revision, a field projection table, full normalization and when to avoid it); the column type, validity check and limits for PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, SQLite and MongoDB; and a guide for plugin and custom type authors (`spec`, `describeRegistrations`, what blocks a form and what only warns).
- **`artisanform` CLI** (`npx artisanform`): `validate <files…>` runs `checkSchema` (options `--policy`, `--manifest`, `--max-bytes`, `--max-steps`, `--max-fields`, `--max-options`, `--no-lint`, `--json`; exit 0 ok, 1 invalid schema, 2 wrong usage), `json-schema` prints the contract schema and `hash <file>` prints the SHA-256 of its canonical JSON. For CI, pre-commit hooks and backends in any language.

## 1.0.0-rc.2 (2026-11-13)

Second release candidate: fixes Next.js compatibility. The v1 contract and the public API (`check:api`) are unchanged from `1.0.0-rc.1`.

### Fixed

- **Next.js App Router:** `artisanform`, `artisanform/headless` and `artisanform/payments/*` now ship the `'use client'` directive. Without it, importing the library from a Server Component failed the build (`Export FormProvider doesn't exist in target module`), because `react-hook-form` resolved to its server stub. `artisanform/schema` has no directive and stays usable on the server.
- **TypeScript 6:** `import 'artisanform/style.css'` now has a type declaration (`exports["./style.css"].types`). Without it, strict side-effect-import checking failed in apps that do not provide `*.css` typings (Next 15).

### Added

- `scripts/consumer-next.mjs` (`bun run check:next`) and a `consumers-next` CI job: a clean Next 15 and 16 app with both routers; checks build, SSR, hydration, a server action and `validateValues` on the server.

## 1.0.0-rc.1 (2026-11-12)

First release candidate of 1.0.0. The v1 schema contract, the public API of `artisanform` and `artisanform/schema`, the capabilities contract and the catalog format are frozen under the rules of [versioning](docs/versioning.md): until 1.0.0 only fixes land. The sections below (all `1.0.0-rc.1`) are what changed since 0.3.0-beta.2: server-side validation and `artisanform/schema`, capabilities, translations, performance gates and the contract freeze. Try it with `npm install artisanform@rc`.

## 1.0.0-rc.1 (Contract freeze)

### Quality

- **Versioning policy and contract guards (AF119):** [versioning](docs/versioning.md) states what may change in a 1.x minor and what needs a major, over three surfaces (the schema contract, the TypeScript API of `artisanform` and `artisanform/schema`, the capabilities contract and catalog format). Enforced by golden fixtures (`src/schema/__tests__/fixtures-v1/`: the 13 catalog examples must parse clean, normalize to the recorded JSON, be idempotent and portable; invalid cases keep their codes and paths) and by `bun run check:api`, which compares every export and declaration of both entries with `api/*.api.txt` (CI, release and `prepublishOnly`). No behavior change.

## 1.0.0-rc.1 (Performance)

### Quality

- **Performance measured against the Web Vitals standard (AF118):** `bun run perf` (Playwright, production build of the playground) checks "form ready", interaction latency, long tasks and layout shift in Chromium (desktop and a mobile profile with the CPU slowed 4x), Firefox and WebKit, plus a per-browser baseline (`perf/web-baseline.json`, +50%). `bun run check:size` gates the gzipped JS, CSS and `artisanform/schema` at +10% over `perf/size.json`. New CI job `perf`. The budgets and what they are based on are in [performance](docs/performance.md). The schema pipeline costs about 1.2 ms for 200 fields, so no library code was changed.
- New playground scenario `perf` (`?demo=perf&fields=50&perStep=50`) and scripts `playground:build` / `playground:preview`; `perf/generate.mjs` takes a `perStep` argument.

## 1.0.0-rc.1 (Translations)

### Back end and front end

- **Translation catalogs (AF117):** the schema stays in its source language and a catalog maps stable text paths (`steps.<id>.fields.<name>.label`, `…options.<value>`, …) to translated text, with plural forms and `{placeholders}`. `<ArtisanForm locale messages loadMessages>` applies it (`es-AR` falls back to `es`, then to the source text); a schema can also carry small catalogs in an optional `i18n` block. Changing `locale` does not reset the typed values, a missing or failing catalog never breaks the form, and `loadMessages` loads only the language in use. Only English ships. `artisanform/schema` gains the pure helpers `extractMessages`, `validateCatalog`, `applyCatalog`, `resolveLocaleChain`, `format` and `placeholdersOf`. See [schema v1](docs/schema-v1.md#translations-).
- **The library's own texts are translatable (AF117):** `labels.<key>` entries of a catalog translate `ArtisanLabels`, including the function labels (`{n}`, plural forms). Precedence: defaults < kit labels < catalog < the `labels` prop. `ArtisanForm` now hands the kit's labels to the wizard separately (`useArtisanWizard` option `kitLabels`), so a catalog is not overridden by an English kit. With no `locale` the output is unchanged.
- **`formatIssue(issue, labels)` (AF117):** turns a `validateValues` issue into the same message the browser shows, in the language of `labels`.

## 1.0.0-rc.1 (Capabilities and payment return routing)

### Back end and front end

- **Capabilities contract (AF115):** `collectReferences`, `describeCapabilities` and `checkCapabilities` in `artisanform/schema` (pure, no React). A front end describes what it registered as a JSON manifest (`artisanform.capabilities/1`); an API checks a schema against it when a revision is published and gets `missing-reference` (kind, id, schema path), `unsupported-field-type`, `unsupported-step-kind`, `missing-feature` or `unsupported-contract`, instead of a render-time `unresolved-reference`. The requirements are derived from the schema (`collectReferences`), so the schema contract did not change. See [schema v1](docs/schema-v1.md#capabilities-what-a-front-end-can-run-).
- **`onUnresolved` (AF115):** `<ArtisanForm onUnresolved>` is called for each name the schema uses that no registry provides; returning `'ignore'` renders without it. Anything else keeps the failure, so the default is unchanged.

### Personalization

- **Payment method selector (AF115):** each method is a card with its logo, its name and a line saying whether the user stays on the page or is redirected. `PaymentPlugin` and every built-in plugin accept `icon` and `description`; Stripe, PayPal, Mercado Pago and Lemon Squeezy ship their brand mark (Simple Icons, CC0). New labels `payHintEmbedded` and `payHintRedirect`, new class slots (`paymentOptions`, `paymentOption`, `paymentOptionIcon`, `paymentOptionText`, `paymentOptionName`, `paymentOptionHint`) and classes in the Bootstrap and Tailwind kits.

### Fixes

- **A redirect return went to the first plugin that could read it (AF115):** two plugins of one provider that share return parameters (Stripe's embedded form and Checkout, the Mercado Pago Brick and Checkout Pro) could record the payment under the wrong provider. The payment step now remembers, per tab, which plugin sent the user away and asks it first. No change to the plugin contract or to the return URLs.

### Documentation

- A Mercado Pago sandbox checklist (test seller and buyer, currency, `auto_return` only over https) in the payments guide. `apps/payments-test` now uses one port (5858) and has server tests that pin the Checkout Pro preference body.
- **`apps/payments-test`: cause of "Una de las partes con la que intentas hacer el pago es de prueba" in Checkout Pro (AF115):** the demo backend sent `MP_PAYER_EMAIL` (an ordinary address that the Payment Brick needs) as the preference's `payer`, so a test seller was paired with a payer that is not a test buyer. Checkout Pro now sends a payer only from the new `MP_CHECKOUT_PAYER_EMAIL` (the test buyer's own e-mail), and variant H of `mp-diagnose.ts` reproduces the old request.

## 1.0.0-rc.1 (Server-side validation)

### Validation and packaging

- **`validateValues` and `artisanform/schema` (AF112):** a validator of **submitted values** that needs no React, Yup or form engine, for backends that store or act on submissions. It returns issues as `{ path, code, params }` (no messages), follows the engine's visibility rules and gives the same result as the browser for the shared rules, and is **stricter where a server must not trust the client** (types, option membership, missing values, OTP and rating limits, real calendar dates, file metadata, URL scheme, a length cap and a guard against catastrophic `pattern`s). The differences are listed in [schema v1](docs/schema-v1.md#validating-values-on-a-server-) and each is pinned by a test; shared JSON fixtures run against both this validator and Yup. It is exported from the new **`artisanform/schema`** entry, which imports no React, Yup, React Hook Form or Zustand: `check:dist` follows its imports and fails on any bare specifier, and a CI consumer with none of them installed imports it and type-checks with `NodeNext`. The root entry still re-exports everything.
- **`optionsSource` on `select` and `radio` (AF112):** their options can come from a source registered in `extensions.options` (called with an empty query), exclusive with inline `options` (`conflicting-properties`). The field shows a loading state and an error state, and a select starts on its first option once loaded, like a static one. Kits receive the resolved options. `check` still needs inline options.
- **Behavior notes:** the form's own validation in the browser is unchanged. `SourcedChoiceFieldV1` is a new member of `NativeFieldV1`; code that narrowed `select`/`radio` to `ChoiceFieldV1` now sees `options` as possibly absent.

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
