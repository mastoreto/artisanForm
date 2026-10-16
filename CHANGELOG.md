# Changelog

Spanish version: [docs/es/CHANGELOG.md](docs/es/CHANGELOG.md).

## Unreleased (Phase 2: React Hook Form)

- **Engine:** values, registration, validation and field arrays now run on React Hook Form (one `useForm` per wizard, Yup through `@hookform/resolvers`). Formik is gone. The v1 contract, Yup rules, Zustand step state, payments, storage and waits are unchanged.
- **Breaking (install):** `react-hook-form` is now a peer dependency (replaces `formik`). Standalone inputs need a `FormProvider` instead of `<Formik>`.
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
- **Tooling:** Biome replaces Prettier; playground with `pnpm playground`; e2e tests with Playwright.

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
