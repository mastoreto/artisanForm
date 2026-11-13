# ArtisanSchema v1

> 🌐 Spanish version: [es/schema-v1.md](es/schema-v1.md)

A public, serializable and versioned contract for defining ArtisanForm forms. This is **Phase 1**: it stabilizes the contract and resolves compatibility with 0.2.0 through an adapter. The engine (React Hook Form + Yup + Zustand) and the UI do not change.

> **How to read this document.** Each capability is marked: ✅ **Implemented**, 🔁 **Compatible through an adapter** (0.2.0 keeps working and is translated) or ⏳ **Pending** (designed/reserved, **not** implemented).

## 1. Goals

- A single **JSON-serializable**, **TypeScript-first** contract with two modes that converge on the same runtime: write it in code (`defineForm`) or receive it from an API (`parseArtisanSchema`).
- Fields and steps **discriminated by `type`**; **declarative** conditions (no code execution); extensions through **registries** (ids), not embedded functions.
- **Versioning** of the schema and of drafts; stable form and step ids.
- A contract that **does not depend** on Formik, React Hook Form, Yup or Zustand (a test and a Biome rule enforce it over `src/schema/**` and `src/persistence/**`).

## 2. Structure

```ts
interface ArtisanSchemaV1 {
  schemaVersion: 1;      // format; any other version is rejected
  id: string;            // identifies the form (drafts are tied to it)
  revision?: number;     // revision of this definition (drafts record it)
  title?: string;
  description?: string;
  ui?: FormUIConfig;
  steps: ArtisanStepV1[];
}
```

| Layer | Where | Status |
| --- | --- | --- |
| Public contract (types) | `src/schema/contract/{types,fields,steps,define}.ts` | ✅ |
| Per-type tables (allowed properties) | `src/schema/contract/specs.ts` | ✅ |
| Conditions (pure evaluator) | `src/schema/contract/conditions.ts` | ✅ |
| Parser / structural validation | `src/schema/parser.ts` | ✅ |
| Normalization + 0.2.0 adapter | `src/schema/{normalize.ts,legacy/adapter.ts}` | ✅ / 🔁 |
| Projection to the engine | `src/engine/project.ts` | ✅ |
| Draft snapshots | `src/persistence/` | ✅ |

## 3. Steps and fields

Every step has an `id` (required, unique), a `title` and a `type`. Common optional properties: `visibleWhen`, `ui: { columns: 1 | 2 }`, `controls`, `hooks: { beforeNext?, onEnter? }` (function **ids**, see §9).

| Step `type` | Own properties | 0.2.0 |
| --- | --- | --- |
| `form` | `fields` | `kind` absent or `form` |
| `payment` | `providers` (ids), `resultName?`, `summary?` (text) | `provider`/`providers` |
| `wait` | `strategy` (id), `message?`, `resultName?`, `failTo?` (step id), `timeoutMs?`, `retry?: { max, backoffMs? }`, `cancellable?` | `kind: 'pending'` (the same three options) |
| `terms` | `content?` (text), `href?`, `accept?: { name?, label? }` | `acceptName`/`acceptLabel` |
| `review` | — | same |
| `result` | `message?`, `errorMessage?`, `actions?: { label, href?, action? }[]` | `actions[].onClick` → `action` (id) |
| `custom` | `renderer` (id), `config?` | `render` (function) |
| `x-…` | `config?` | other `kind`s registered with `stepTypes` |

Fields share `FieldBase` (`name`, `id?`, `label?`, `description?`, `required?`, `disabled?`, `defaultValue?`, `visibleWhen?`, `ui?`). Frequent properties stay on the field (`name`, `type`, `label`, `required`, `disabled`, `defaultValue`, `placeholder`); advanced rules go under `validation` and presentation under `ui`.

| Family | `type` | Own properties |
| --- | --- | --- |
| Text | `text` `email` `tel` `url` `password` `textarea` | `placeholder`, `mask`, `prefix`, `suffix`, `autoComplete`, `inputMode`, `readOnly`, `maxLength`, `validation: { minLength, maxLength, pattern, sameAs }` |
| Number | `number` | `placeholder`, `prefix`, `suffix`, `step`, `validation: { min, max }` |
| | `range` / `rating` / `otp` | `step` + `validation` / `length` / `length`, `charset` |
| Date | `date` `time` `datetime` `month` | `placeholder`, `validation: { min, max }` (ISO strings) |
| | `daterange` | + `endName`, `endLabel` (**produces two values**) |
| Choice | `select` `radio` | `options` or `optionsSource` (id), not both |
| | `check` | `options` (required) |
| | `combobox` `multiselect` | `placeholder`, `options` and/or `optionsSource` (id) |
| | `dynamicSelect` | `options`, `dependentName`, `dependentOptions` or `dependentOptionsSource` (id) (**two values**) |
| Boolean | `checkbox` `switch` | — |
| Files | `file` `image` | `accept`, `storage`, `capture`, `validation: { maxSize, minFiles, maxFiles }` |
| Repeatable | `array` | `itemFields`, `addLabel`, `validation: { minItems, maxItems }` |
| Content | `heading` `paragraph` `callout` `divider` | `text`, `variant` (hold no value) |
| Custom | `x-…` | `config` (JSON) |

A field with a property its type does not accept is a parser **error** (`unknown-property`); it is not ignored.

### Waiting: timeout, retry and cancel ✅

On a `wait` step (or a 0.2.0 `pending` step): `timeoutMs` fails the step if it is still pending after that long (message `labels.waitTimeout`); `retry: { max, backoffMs? }` retries by itself after a failure (delay `backoffMs × n`, default 1000 ms, `max` from 1 to 10) before the user sees it, and the user's own Retry starts the count again; `cancellable: true` shows a Cancel button (`labels.cancel`) that aborts the wait and goes where `failTo` goes. They apply to every strategy, on top of whatever the strategy does itself (`polling` has its own `timeout`).

### Transitions, loops and revisit ✅

Optional on every step; a schema that uses none of them navigates exactly as before (next visible step, Back goes one step back).

```jsonc
{ "id": "plan", "type": "form", "title": "Plan", "fields": [ … ],
  "next": [ { "when": { "field": "plan", "operator": "eq", "value": "pro" }, "to": "pay" },
            { "to": "review" } ] }
```

- **`next: { when?, to }[]`**: after the step validates, the first edge whose `when` holds (always, if omitted) decides where to go; `to` is a step id. No match, a hidden target or a `result` target falls back to the next visible step.
- **`loop: { max }`**: required on the target of an edge that goes back (or to itself). It is how many times the step can be **entered again** (the first visit does not count); once used up, the edge is skipped.
- **`revisit: 'allow' | 'deny'`** (default `allow`): `deny` means that once the step is finished the user cannot come back to it, and Back stops right after it (a paid step cannot be undone). The stepper and `goToStep` refuse jumps across it.
- **Back** follows the path actually taken (a history of finished steps, saved in the draft as `history?` in the snapshot; `snapshotVersion` stays 1), not the step order.
- **Parser:** an edge to an unknown id is `unknown-step-reference`; going back to a step without `loop` is `unbounded-loop` (error); a step no path reaches is `unreachable-step` (warning); `loop.max` must be an integer from 1 to 1000.
- **Limits:** the last visible non-`result` step still submits (branches should reconverge, or hide steps with `visibleWhen`); no parallel branches or sub-flows.

## 4. Declarative conditions ✅

```json
{ "all": [
  { "field": "age", "operator": "lt", "value": 18 },
  { "not": { "field": "parent", "operator": "eq", "value": true } }
] }
```

Operators: `eq neq gt gte lt lte in notIn filled empty`; combinators `all any not`. No `eval`, no `new Function`, no callbacks. Rules (tested in `src/schema/__tests__/conditions.test.ts`):

| Case | Rule |
| --- | --- |
| Missing field | reads as `undefined` |
| `eq` / `neq` | **strict**: `5 ≠ "5"`, `null ≠ undefined`; arrays by deep equality |
| `gt gte lt lte` | only number↔number or string↔string; different types ⇒ `false` |
| `in` / `notIn` | `value` must be an array; if the field's value is an array, it means "intersects" |
| `filled` | not `undefined`, `null`, `''` nor an array without filled items (`0` and `false` **are** filled) |
| `all([])` / `any([])` | `true` / `false` |
| `coerce: "string"` | opt-in: compares as strings and reads `null`/`undefined` as `''`. The adapter uses it to reproduce `showIf` |

The parser rejects references to fields that do not exist (`unknown-field-reference`) and conditions nested deeper than 32 levels. They may refer to fields in later steps, to the names produced by `dynamicSelect`/`daterange`, and to the values stored by `payment`, `wait.resultName` and `terms`.

**Visibility (unchanged from 0.2.0).** A hidden field is not rendered, **not validated** and **not submitted**; a hidden step is skipped and its fields are neither validated nor submitted either. The value is kept in state, so it comes back if the condition holds again.

⏳ Conditions on fields **inside rows** of an `array`: not supported (explicit error).

## 5. Visual configuration ✅ (contract) / ⏳ (interpretation)

```ts
FormUIConfig  { layout?: 'vertical' | 'horizontal'; density?: 'compact' | 'comfortable'; labelPosition?: 'top' | 'left' }
StepUIConfig  { columns?: 1 | 2 }
FieldUIConfig { span?: 1 | 2; variant?: string }
```

Semantic values: no CSS and no Tailwind classes in the contract. The default renderer interprets **`columns`, `span`, `density` and `labelPosition`** (and exposes `layout` as a `data-layout` styling hook); `variant` is only handed to custom components (`field.uiVariant`). See [ui.md](ui.md).

`width: 'half' | 'full'` (0.2.0) ⇒ `ui.span: 1 | 2`. `helperText` ⇒ `description`.

## 6. Using it from TypeScript ✅

```ts
import { ArtisanForm, defineForm } from 'artisanform';

const registration = defineForm({
  schemaVersion: 1,
  id: 'registration',
  revision: 1,
  steps: [
    {
      id: 'account',
      type: 'form',
      title: 'Account',
      fields: [
        { name: 'email', type: 'email', label: 'Email', required: true, placeholder: 'name@company.com', validation: { maxLength: 255 }, ui: { span: 2 } },
        { name: 'kind', type: 'radio', label: 'Type', options: [{ value: 'person', label: 'Person' }, { value: 'company', label: 'Company' }] },
        { name: 'company', type: 'text', label: 'Company', required: true, visibleWhen: { field: 'kind', operator: 'eq', value: 'company' } },
      ],
    },
    { id: 'done', type: 'result', title: 'Done', message: 'Thank you' },
  ],
});

<ArtisanForm scheme={registration} onSubmit={save} persistKey="registration" />;
```

`defineForm` is an **identity function**: it gives autocompletion and checks the literal against the contract, and returns the same object (what you write is exactly what can be serialized). The types reject, at compile time, things such as `options` on a `text`, functions in the schema or an `array` inside an `array`.

## 7. Using it from remote JSON ✅

```ts
import { ArtisanForm, parseArtisanSchema, type SchemaPolicy } from 'artisanform';

const policy: SchemaPolicy = {
  hooks: ['checkName'],
  waitStrategies: ['orderStatus'],
  paymentProviders: ['stripe'],
  optionsSources: ['countries'],
};

const result = parseArtisanSchema(await (await fetch('/api/forms/registration')).json(), { policy });
if (!result.success) {
  console.error(result.issues); // [{ severity, code, path, message }]
  return;
}

<ArtisanForm scheme={result.schema} extensions={extensions} onSubmit={save} />;
```

A remote schema is **not trusted just because it is valid JSON**: with a `policy`, every reference to something local (`x-…` types, hooks, wait strategies, renderers, actions, payment providers, option sources) must be on the list. Anything not listed is not allowed (`policy-violation`). Without a `policy` (`trusted` mode, the one for schemas written in code) any id is accepted.

## 8. Structural validation ✅

`parseArtisanSchema(input: unknown, { policy? })` → `{ success: true, schema, issues }` | `{ success: false, issues }`. It is **hand-written and dependency-free** (it does not use AJV: AJV compiles validators with `new Function`, which clashes with the principle of never running dynamic code and with strict CSPs). It checks: a valid, serializable JSON object, `schemaVersion`, required properties, discriminators, unknown properties, duplicate step ids and names, conditions and their references, `failTo`, patterns (valid `RegExp`, ≤ 500 characters) and the policy. Each `SchemaIssue` carries a stable `code` and a readable `path` (`steps[1].fields[0].type`). It returns **the same object** it received (it neither copies nor mutates it).

Frequent codes: `missing-version`, `unsupported-version` (future versions), `unknown-type`, `unknown-property`, `duplicate-id`, `duplicate-name`, `unknown-field-reference`, `unknown-step-reference`, `not-serializable`, `policy-violation`, `invalid-pattern`, `unsupported-in-array`, `unsafe-url`, `invalid-name`, `conflicting-properties`.

Two rules protect schemas that come from an untrusted source (a CMS, a backend): a `href` (terms step, result `actions`) must be `http:`, `https:`, `mailto:` or a relative reference, otherwise `unsafe-url`; and a field name cannot be `__proto__`, `constructor` or `prototype`, nor contain `.`, `[` or `]`, otherwise `invalid-name`. The renderer also skips an unsafe `href`, which covers 0.2.0 schemas.

This validates **the definition**. In the browser, the **values** a user types are validated by Yup (unchanged); on a server, use `validateValues` below.

### Validating values on a server ✅

Storing and serving schemas, the `checkSchema` gate, the JSON Schema and the CLI are in the [backend guide](backend.md).

`validateValues` checks the **values** a client submitted against the same schema, with no React, Yup or form engine. It is exported from `artisanform/schema`, an entry that imports none of them (a build check fails if it ever does), so it runs in Node, a worker or any JS runtime.

```ts
import { parseArtisanSchema, validateValues } from 'artisanform/schema';

const parsed = parseArtisanSchema(storedJson, { policy });          // once, when you receive or store it
const result = validateValues(parsed.schema, submitted, {
  prune: true,                                   // also return the values without hidden fields and unknown keys
  dynamicOptions: { countries: ['ar', 'uy'] },   // the options of each optionsSource you want checked
});
if (!result.ok) return reply(400, result.issues); // [{ path: 'jobs[0].role', code: 'required', params? }]
save(result.values);
```

Issues carry a `code` and `params`, never a message: the UI formats them. Codes: `required`, `type`, `tooLong`, `minLength`, `maxLength`, `pattern`, `unsafePattern`, `mustMatch`, `invalidEmail`, `invalidUrl`, `invalidPhone`, `invalidNumber`, `minValue`, `maxValue`, `invalidDate`, `minDate`, `maxDate`, `endBeforeStart`, `invalidOption`, `invalidLength`, `invalidCharset`, `outOfRange`, `minItems`, `maxItems`, `minFiles`, `maxFiles`, `invalidFile`, `fileTooLarge`, `fileType`, `custom`.

It follows the same rules as the form: a hidden field or step is not validated and not returned, the `terms` step needs its checkbox, and the shared rules (lengths, `pattern`, `sameAs`, number and date bounds, array and file counts) give the same result. **It is deliberately stricter than the browser**, because a server must not trust the client. The differences, each pinned by a test:

- **Types.** A number must be a number (`"5"` is `invalidNumber`), text a string, a checkbox a boolean, a list an array.
- **Missing values.** A missing key is reported. The browser always starts from initial values (the first option of a select, `false`, `[]`), so it never sees them missing.
- **Options.** `select`, `radio`, `check`, `multiselect`, `combobox` and `dynamicSelect` values must be among the options (`invalidOption`). For an `optionsSource` this is checked only when you pass its options in `dynamicOptions`.
- **OTP and rating.** An OTP must have exactly `length` characters of its `charset`; a rating must be a whole number from 1 to `length`.
- **Dates** must be real calendar days (`2026-02-31` is `invalidDate`).
- **Files.** Each entry must be a descriptor (`id`, `name`, `size`); `maxSize` and `accept` are enforced.
- **Limits.** A text longer than `maxStringLength` (10 000 by default) is `tooLong`, and a `pattern` with nested quantifiers (`(a+)+`) is `unsafePattern`: a schema pattern is untrusted input on a server and is never run if it can blow up. Compiled patterns are cached.
- **URLs** need a scheme (`http`, `https` or `ftp`).

Custom `x-*` field types are not validated unless you pass a rule for them in `customTypes`.

## 9. Extensibility ✅

The schema only names things; executable code lives in local registries:

| Piece | In the schema | Registered in |
| --- | --- | --- |
| Custom field type | `type: "x-stars"`, `config` | `fields` prop (`FieldDefinition`) |
| Custom step type | `type: "x-fancy"`, `config` | `stepTypes` prop (`StepDefinition`) |
| Async options | `optionsSource` / `dependentOptionsSource` | `extensions.options` / `extensions.dependentOptions` |
| Wait strategy | `strategy` | `extensions.waits` |
| Step hooks | `hooks.beforeNext` / `hooks.onEnter` | `extensions.hooks` |
| Step renderer | `renderer` | `extensions.renderers` |
| Result actions | `actions[].action` | `extensions.actions` |
| Payments / storage | `providers` / `storage` | `plugins` / `storage` props (unchanged) |

A reference nobody registered is **never ignored silently**: the form does not run it. `<ArtisanForm>` reports it as an issue (`unresolved-reference`) through `onSchemaIssues` and, when it stops the form, shows a short message instead of throwing (`fallback` replaces it, `showSchemaIssues` lists the errors). A missing options source only degrades its field (a warning). Custom names must start with `x-` so they can never collide with a future native type; a 0.2.0 type without the prefix (`stars`) and its v1 equivalent (`x-stars`) resolve to the same registry entry.

`optionsSource` exists on `combobox`, `multiselect`, `select` and `radio` (and `dependentOptionsSource` on `dynamicSelect`). On `select` and `radio` it replaces `options` (not both) and the source is called with an empty query to get every option; the field shows a loading state and an error state like `dynamicSelect`. ⏳ **Limitation:** `check` still requires inline `options`.

### Capabilities: what a front end can run ✅

A schema only names hooks, wait strategies, renderers, actions, option sources, payment providers, storage adapters and custom types; the code lives in the app that renders it. When schemas come from an API, the API needs to know **when it publishes a schema** whether the deployed front end can run it, instead of finding out as a render-time `unresolved-reference`. Three pure functions in `artisanform/schema` (no React, so a Node API can use them) cover it:

```ts
import { checkCapabilities, collectReferences, describeCapabilities } from 'artisanform/schema';

// In the front end's build or CI: what this app can run. A plain JSON manifest.
const manifest = describeCapabilities({
  extensions,                              // the object you pass to <ArtisanForm extensions>
  paymentProviders: ['stripe', 'mp'],      // ids of plugins.payments
  storage: ['docs'],                       // keys of the storage adapters
  fieldTypes: ['x-stars'],                 // custom field types (the `fields` prop)
});                                        // upload it to your API

// In the API, when a revision is published (or in the front, before rendering a fetched schema):
const issues = checkCapabilities(schema, manifest);   // [] means "it can run it"
const requires = collectReferences(schema);           // store it with the revision
```

`checkCapabilities` returns `missing-reference` (with the `kind`, `id` and the schema `path`), `unsupported-field-type`, `unsupported-step-kind`, `missing-feature` and `unsupported-contract`. **Features** are optional behaviors a schema can depend on (`transitions`, `wait-options`, `options-source-choice`): a front built on an older library lacks them, so a schema written for a newer one is refused instead of misbehaving. The manifest carries a `contract` id (`artisanform.capabilities/1`) and is plain JSON, so it can be stored and compared later. The requirements are derived from the schema, so the contract itself did not change.

To keep a form running when an optional name is missing, pass `onUnresolved` to `<ArtisanForm>`: it is called for each reference no registry provides, and returning `'ignore'` renders without it (an optional hook does not run, a source's options stay empty). Anything else keeps the failure, so the default is unchanged. Only ignore what is optional: a missing wait strategy or renderer leaves its step with nothing to do.

### Translations ✅

The schema is written in one **source language** (English by default) and stays untouched. A **catalog** maps stable text paths to the translated text; the form applies it over the source text, so the typed values, the field names and every id are the same in all languages.

```text
title · description
steps.<stepId>.title | summary | message | errorMessage | content
steps.<stepId>.controls.nextLabel | previousLabel
steps.<stepId>.accept.label · steps.<stepId>.actions.<index>.label
steps.<stepId>.fields.<name>.label | description | placeholder | prefix | suffix | endLabel | addLabel | text
steps.<stepId>.fields.<name>.options.<value>
steps.<stepId>.fields.<name>.dependentOptions.<parent>.<value>
steps.<stepId>.fields.<name>.fields.<child>.label   (rows of an array)
labels.<key>                                         (the library's own texts, see `ArtisanLabels`)
```

A value is a string, or plural forms `{ one, other, … }` (`other` is required; for `labels.*` functions the form follows the first numeric argument through `Intl.PluralRules`). `{name}` placeholders are filled by the library (`labels.step`: `"Paso {n} de {total}: {title}"`). Renaming an id orphans its translations: `validateCatalog` reports it.

Three ways to supply catalogs, same format; for each tag of the chain (`es-AR` → `es`) the first that has one wins:

```tsx
<ArtisanForm scheme={scheme} locale="es-AR"
  messages={{ es }}                                      // 1. a prop
  loadMessages={(l) => import(`./catalogs/${l}.json`)}   // 2. on demand, per locale
/>
// 3. inside the schema: { "i18n": { "sourceLocale": "en", "messages": { "es": { ... } } } }
```

Small forms can carry their catalogs in the optional `i18n` block; large ones load only the language in use with `loadMessages` (its result may be the catalog or a module with a `default`). While a catalog loads, or if it fails, the source text shows: a missing translation never breaks a form, and changing `locale` does not reset what the user typed. Only English ships with the library; the rest come from you.

The library's own texts follow **defaults < kit `labels` < the catalog's `labels.*` < the `labels` prop**. Server-side `validateValues` issues can be turned into messages in the same language with `formatIssue(issue, labels)`.

Pure helpers in `artisanform/schema` (no React) for the publishing flow of an API: `extractMessages(schema)` (the English template to translate), `validateCatalog(schema, catalog)` → `{ missing, orphan, badPlaceholders }`, `applyCatalog(schema, [catalogs])` (a translated copy, e.g. to serve one language), `resolveLocaleChain('es-AR')` → `['es-AR', 'es']`, `format` and `placeholdersOf`.

Out of scope: right-to-left layouts, the format of `<input type="date">` (follows the browser) and legacy 0.2.0 `ReactNode` texts.

## 10. Versioning ✅

The 1.x guarantees (what may change in a minor, what needs a major, and the guards that enforce it) are in [versioning](versioning.md).

- `schemaVersion: 1` identifies the format. A higher number is rejected (`unsupported-version`) rather than misinterpreted. A schema **without** `schemaVersion` is treated as 0.2.0 by `normalizeArtisanSchema`.
- `id` identifies the form and `revision` a concrete definition; both are recorded in drafts.
- Data migrations are opt-in (`snapshotMigrations`, §11): without them an incompatibility is detected and the consumer decides.

## 11. Persistence ✅

With `persistKey`, the draft is stored in `localStorage['artisanform:<persistKey>']` as:

```ts
interface ArtisanSnapshotV1 {
  snapshotVersion: 1;
  formId: string;          // ArtisanSchemaV1.id
  formRevision?: number;
  currentStepId: string;   // by id, not by index
  values: Record<string, JSONValue>;
}
```

- **Secrets**: never saved (passwords and any field marked secret, also inside `array` rows); the previous `withoutSecrets` protections are kept.
- **Files**: only as the serializable descriptors the adapter returned (`{ id, name, size, type?, url? }`); never `File`. Any value that is not JSON is dropped on save.
- **0.2.0 drafts** (`{ values, step }`): restored and rewritten as a snapshot on the next save. In 0.2.0 `step` was the index among the **visible** steps; it is converted to a `stepId` by evaluating visibility with the saved values. A 0.2.0 draft knows no `formId`: it adopts the running form's.
- **Incompatibilities** (`form-id`, `revision`, `step-missing`, `unsupported-version`, `corrupt`): the draft is **never deleted silently**. `onSnapshotConflict(conflict) → 'backup' | 'restore' | 'discard'`; the default is `backup`: it is moved to `artisanform:<key>:incompatible` (a single slot) and the form starts clean. `restore` applies the values anyway (starting at the first step if the step no longer exists); `discard` deletes it. If the revision is missing on either side it is not a conflict.
- **Careful with 0.2.0 forms:** their step ids are derived from the title, so **renaming or reordering titles makes an already saved draft miss its step** (`step-missing`) and, with the default policy, it is backed up and the form starts clean. In 0.2.0 the draft was restored by index and survived a title change. Move to `ArtisanSchemaV1` with explicit ids, or use `onSnapshotConflict={() => 'restore'}` to keep the values (it starts at the first step).
- If the saved step exists but is currently hidden, the values are restored and it starts at the first visible step.
- **Where and when it is written:** `draftStorage` (anything with `getItem`/`setItem`/`removeItem`, synchronous: `sessionStorage`, an in-memory or your own store; default `localStorage`) and `draftDebounceMs` (default 0 = on every change; with a delay it also writes when the step changes or the form unmounts, and never after a successful submit).
- **Migrations:** `snapshotMigrations={{ 1: (s) => ({ ...s, formRevision: 2, values: { ...s.values, fullName: s.values.name } }) }}` brings a draft saved against revision 1 up to the form's `revision`. Each migration receives a copy of the snapshot at revision *n* and returns it at a higher revision; the chain runs until the revision matches. If a migration is missing, throws, returns something that is not a snapshot or does not raise the revision, the draft goes through `onSnapshotConflict` as before. After a successful migration the original is kept in the backup slot. `migrateSnapshot` is exported to test them.
- **IO helpers** (exported): `readSnapshot`, `writeSnapshot`, `clearSnapshot`, `readRaw`, `backupStored`, `createSnapshot`, `parseStored`, `checkSnapshot`, `migrateSnapshot`.

## 12. Compatibility with 0.2.0 🔁

`scheme` accepts a `FormSchema` (0.2.0) **or** an `ArtisanSchemaV1`; both go through the same pipeline:

```
FormSchema (0.2.0) ─► adapter (legacy/adapter.ts) ─┐
                                            ├─► NormalizedArtisanSchema ─► projection ─► current engine
ArtisanSchemaV1 ───► parser + defaults ─────┘
```

There are no two engines and no compatibility branches in the components. `FormSchema`, `FieldSchema` and `StepSchema` are **`@deprecated`** but nothing is removed (the `scheme`, `persistKey`, `initialValues`, `onSubmit`, `onChange`, `onStepChange` and `step` props, registries, plugins, storage and wait strategies all stay the same).

| 0.2.0 | v1 |
| --- | --- |
| `kind` | `type` (`pending` → `wait`; no `kind` → `form`; others → `x-<kind>`) |
| `showIf { field, equals, not }` | `visibleWhen`: `equals` → `in` with `coerce: "string"`; no `equals` → `filled`; `not` → `{ not }` |
| `width` | `ui.span` (`half` → 1, `full` → 2) |
| `helperText` | `description` |
| `label` on `heading`/`paragraph`/`callout` | `text` |
| `min`/`max` | text → `validation.minLength/maxLength`; `number`/`range` → `validation.min/max` |
| `pattern`, `sameAs` | `validation.pattern`, `validation.sameAs` |
| `minDate`/`maxDate` | `validation.min/max` |
| `minItems`/`maxItems` | `validation.minItems/maxItems` |
| `minFiles`/`maxFiles`/`maxSize` | `validation.*` |
| `loadOptions` / `loadDependentOptions` | `optionsSource` / `dependentOptionsSource` (function → *binding*) |
| `beforeNext` / `onEnter` / `render` / `wait` / `actions[].onClick` | `hooks.*` / `renderer` / `strategy` / `actions[].action` (function → *binding*) |
| Custom field type (`stars`) | `x-stars`, extras under `config` |

**Bindings.** Functions and non-JSON content (JSX in `content`/`summary`) cannot live in the schema: the adapter **extracts** them into a bindings map with synthetic ids (`legacy:<stepId>:beforeNext`) and the schema refers to them by id. `normalizeArtisanSchema(...)` returns `{ schema, bindings, portable, source, issues }`; `portable` is `true` only when no binding was needed and nothing was dropped, that is, only then can the schema be sent as JSON and rebuilt elsewhere. The adapter **never throws**: whatever could not be represented is reported as a *warning* (`extracted-binding`, `unknown-legacy-property`, `ignored-legacy-property`, `duplicate-name`…).

**Derived step ids.** `slug(title)` (accents folded), `-2`, `-3`… on collisions, `<type>-<position>` if the title yields nothing. They are deterministic (no randomness, no dates) but **change if steps are reordered or renamed**: that is exactly why v1 requires an explicit `id`.

**Deliberate differences.** `failTo` (an index in 0.2.0) is converted to an id and stays an id: the wizard resolves it against the **visible** steps when the wait fails (if that step is hidden, the button goes back one step). In v1 a duplicate `name` is an error; in 0.2.0 it is still allowed and only warns. A `terms` step with its own `fields` is not representable in v1 (they are dropped with a warning; the default checkbox applies). `showIf` conditions inside `array` rows never applied and are dropped with a warning.

## 13. Current limitations

- The default UI gives `layout: 'horizontal'` no styling of its own (only the `data-layout` hook) and does not use `variant` (⏳).
- No arbitrary nesting: `array` rows are flat (no nested `array`, content, `x-…` types or `visibleWhen`).
- `optionsSource` not on `check`.
- `hooks` and `onSnapshotConflict` of a 0.2.0 schema are still TypeScript code, not data.
- Validation messages and interface texts still come from `labels` (not from the schema).
- A single backup slot per key; storage must be synchronous (no async drafts yet).

## 14. Reserved for future phases ⏳

Migrating Yup → another validator (the seam is `project.ts` + `FieldDefinition.rules`: the contract and `src/schema` do not change), custom design systems that interpret `ui`, a visual builder, a *headless* engine, versioned forms served from a backend with migrations, nesting of repeatable fields and conditions inside rows.
