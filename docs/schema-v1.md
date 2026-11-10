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
| Choice | `select` `radio` `check` | `options` (required) |
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

Frequent codes: `missing-version`, `unsupported-version` (future versions), `unknown-type`, `unknown-property`, `duplicate-id`, `duplicate-name`, `unknown-field-reference`, `unknown-step-reference`, `not-serializable`, `policy-violation`, `invalid-pattern`, `unsupported-in-array`, `unsafe-url`, `invalid-name`.

Two rules protect schemas that come from an untrusted source (a CMS, a backend): a `href` (terms step, result `actions`) must be `http:`, `https:`, `mailto:` or a relative reference, otherwise `unsafe-url`; and a field name cannot be `__proto__`, `constructor` or `prototype`, nor contain `.`, `[` or `]`, otherwise `invalid-name`. The renderer also skips an unsafe `href`, which covers 0.2.0 schemas.

This validates **the definition**. Validating **the values** a user types is still Yup (unchanged).

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

A reference nobody registered **fails explicitly** (`ArtisanSchemaError`, `unresolved-reference`); it is not ignored. Custom names must start with `x-` so they can never collide with a future native type; a 0.2.0 type without the prefix (`stars`) and its v1 equivalent (`x-stars`) resolve to the same registry entry.

⏳ **Limitation:** `optionsSource` only exists on `combobox`/`multiselect` (and `dependentOptionsSource` on `dynamicSelect`): that is where the engine knows how to load options asynchronously. `select`/`radio`/`check` require inline `options`.

## 10. Versioning ✅

- `schemaVersion: 1` identifies the format. A higher number is rejected (`unsupported-version`) rather than misinterpreted. A schema **without** `schemaVersion` is treated as 0.2.0 by `normalizeArtisanSchema`.
- `id` identifies the form and `revision` a concrete definition; both are recorded in drafts.
- Automatic data migrations are ⏳ out of scope: an incompatibility is detected and the consumer decides (§11).

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
- `optionsSource` only on `combobox`/`multiselect`.
- `hooks` and `onSnapshotConflict` of a 0.2.0 schema are still TypeScript code, not data.
- Validation messages and interface texts still come from `labels` (not from the schema).
- Snapshots have no automatic migrations; a single backup per key.

## 14. Reserved for future phases ⏳

Migrating Yup → another validator (the seam is `project.ts` + `FieldDefinition.rules`: the contract and `src/schema` do not change), custom design systems that interpret `ui`, a visual builder, a *headless* engine, versioned forms served from a backend with migrations, nesting of repeatable fields and conditions inside rows.
