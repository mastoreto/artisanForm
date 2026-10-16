# ArtisanForm

React library for building multi-step forms (wizards) from a declarative definition (`scheme`). It ships ready-made inputs styled with Tailwind, validation with React Hook Form + Yup and step state in Zustand. It is developed and documented with Storybook.

> 🌐 Spanish version: [docs/es/README.md](docs/es/README.md)

> **Status:** version 0.2.0 plus the unreleased v1 schema contract: a `scheme`-driven wizard with 30+ field types, special steps (terms, payment, waiting, review, result), files with pluggable storage and payment plugins (Stripe, Lemon Squeezy, Mercado Pago, PayPal). Not published to any registry yet. See [Project status](#project-status).

## Stack

| Area                   | Technology                                                  |
| ---------------------- | ----------------------------------------------------------- |
| UI                     | React 18, TypeScript (strict)                               |
| Styles                 | Tailwind CSS 3, `clsx` + `tailwind-merge`                   |
| Step state             | Zustand 5                                                   |
| Forms and validation   | React Hook Form 7 + Yup                                     |
| Documentation          | Storybook 8 (`@storybook/react-vite`)                       |
| Build                  | Vite 5 in library mode + `vite-plugin-dts`                  |
| Tests                  | `bun test` + Testing Library (happy-dom), Playwright (e2e)  |
| Formatting and linting | Biome 2                                                     |
| Package manager        | pnpm                                                        |

## Getting started

```bash
pnpm install
pnpm storybook   # http://localhost:6006
```

| Script                      | Description                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm storybook`            | Storybook dev server (port 6006)                                                                    |
| `pnpm build-storybook`      | Static Storybook                                                                                    |
| `pnpm build`                | Library build in `dist/` (ES + CJS + `.d.ts`)                                                       |
| `pnpm typecheck`            | `tsc --noEmit`                                                                                      |
| `pnpm lint` / `pnpm format` | Biome check / check --write                                                                         |
| `pnpm playground`           | React test app (http://localhost:5173) that uses `src/` with HMR; scenarios at `?demo=<id>`         |
| `pnpm e2e`                  | Playwright tests (`e2e/`) against the playground. First time: `npx playwright install chromium`     |
| `bun test`                  | Unit and component tests (`*.test.ts(x)`)                                                           |

## Usage

```tsx
import { ArtisanForm, type FormSchema } from 'artisanform';

const scheme: FormSchema = {
  steps: [
    {
      title: 'Personal data',
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true, min: 3 },
        { type: 'date', name: 'birth', label: 'Date of birth' },
      ],
    },
    {
      title: 'Location',
      fields: [
        {
          type: 'dynamicSelect',
          name: 'country',
          dependentName: 'city',
          label: 'Country and city',
          required: true,
          options: [{ value: 'ar', label: 'Argentina' }],
          dependentOptions: { ar: [{ value: 'bsas', label: 'Buenos Aires' }] },
        },
      ],
    },
  ],
};

<ArtisanForm scheme={scheme} onSubmit={(values) => console.log(values)} />;
```

> Built-in UI texts (buttons, validation messages) default to English; override any of them with the `labels` prop. Field labels, names and step titles come from your schema and are free text in any language.

### `FormSchema` (0.2.0 format)

| Type          | Properties                                                                                                                                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FormSchema`  | `steps: StepSchema[]`                                                                                                                                                                                                                                                       |
| `StepSchema`  | `title`, `fields: FieldSchema[]`                                                                                                                                                                                                                                            |
| `FieldSchema` | `type`, `name`, `label`, `placeholder?`, `options?`, `required?`, `min?`, `max?`, `pattern?`, `itemFields?`, `minItems?`, `maxItems?`, `defaultValue?`, `autoComplete?`, `inputMode?`, `readOnly?`, `maxLength?`, `step?`, `minDate?`, `maxDate?`, `disabled?`, `helperText?`, `sameAs?`, `showIf?`, `dependentName?`, `dependentOptions?`, `loadDependentOptions?` |

Field types (`type`): `text`, `email`, `number`, `tel`, `url`, `textarea`, `password`, `date`, `time`, `datetime`, `month`, `daterange`, `checkbox`, `switch`, `range`, `rating`, `otp`, `file`, `image`, `select`, `dynamicSelect`, `combobox`, `multiselect`, `check`, `radio`, `array`, and display-only content: `heading`, `paragraph`, `callout`, `divider`.

- `required` → mandatory (for `check`, at least one option).
- `min` / `max` → text length, or numeric value for `number`. Not validated on empty optional fields.
- `pattern` → source of a regular expression (e.g. `'^[A-Z]{3}$'`). `email` validates the address format.
- **Content:** `heading`, `paragraph`, `callout` (`variant`: info/success/warning/error) use `label` as their text and hold no value; `divider` is a rule. `width: 'half'` makes two fields share a row.
- **Text:** `mask` (`#` digit, `A` letter, `*` alphanumeric; e.g. `##-########-#`), `prefix`/`suffix` (e.g. `$` for amounts).
- **Dates:** `date`, `time`, `datetime`, `month` accept `minDate`/`maxDate`; `daterange` stores `name` (from) and `endName` (to, validated not to be earlier).
- **`range`** (number, `min`/`max`/`step`), **`rating`** (stars, `length`), **`otp`** (`length`, `charset`).
- **`combobox`** (one value) and **`multiselect`** (several, with chips): they filter `options` as you type or call `loadOptions(text)` to search your API.
- **`array`** (repeatable rows, "add another"): `itemFields` defines the fields of each row, `minItems`/`maxItems` bound the count and `addLabel` changes the button. The value is a list of objects (`[{ name, mail }]`); each row is validated with its fields' rules. Rows cannot use `showIf` or nested arrays; if a row has passwords, the field is not saved to drafts.
- `checkbox`/`switch` hold a boolean; with `required` they must be checked.
- `autoComplete`, `inputMode`, `readOnly`, `maxLength`, `step` go to the native element; dates accept `minDate`/`maxDate` (`YYYY-MM-DD`).
- `defaultValue` → initial value (array for `check`, boolean for `checkbox`/`switch`). `disabled` and `helperText` apply to every type.
- `dynamicSelect` holds two values: `name` (first select) and `dependentName` (second), whose options come from `dependentOptions[firstValue]` or, when async, from `loadDependentOptions(firstValue)` (returns a promise of options; shows loading and error states).

### Schema v1 (serializable and versioned)

Besides the format above (0.2.0, which keeps working), `scheme` accepts an **`ArtisanSchemaV1`**: plain JSON with `schemaVersion`, `id`, steps with a stable `id` and a `type`, declarative conditions (`visibleWhen`) and id-based references to executable code (`extensions`). You can write it in TypeScript with `defineForm`, or receive it from an API and validate it with `parseArtisanSchema` (with a `SchemaPolicy` for remote schemas). Drafts (`persistKey`) are stored as `ArtisanSnapshotV1`, with the step by id.

```ts
import { ArtisanForm, defineForm } from 'artisanform';

const form = defineForm({
  schemaVersion: 1,
  id: 'contact',
  steps: [{ id: 'main', type: 'form', title: 'Contact', fields: [{ name: 'email', type: 'email', required: true }] }],
});

<ArtisanForm scheme={form} onSubmit={save} />;
```

Full guide (fields, steps, conditions, remote JSON, extensibility, versioning, persistence, compatibility and limitations): [docs/schema-v1.md](docs/schema-v1.md) ([Spanish](docs/es/schema-v1.md)).

### Conditionals and cross-field validation

- `showIf: { field, equals?, not? }` on a field or step (0.2.0 format; v1 uses `visibleWhen`): it is shown only when `field` holds one of the `equals` values (or has any value when omitted); `not: true` inverts it. Hidden elements are not rendered, validated or sent in `onSubmit`, and hidden steps are skipped.
- `sameAs: 'otherField'` requires the value to match another field's (e.g. password confirmation).

### Steps

`StepSchema` accepts, besides `title` and `fields`:

| Property             | Description                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kind`               | Step type: `form` (default), `terms`, `payment`, `pending`, `review`, `result`, `custom` (plus any you register with `stepTypes`).               |
| `beforeNext(values)` | Runs after the step validates and before moving on. Return `{ error }` or throw to block with that message (e.g. create an order on your backend). |
| `onEnter(values)`    | Runs every time the step becomes the current one.                                                                                                |
| `controls`           | `hidden`, `hidePrevious`, `hideNext`, `nextDisabled`, `nextLabel`, `previousLabel`.                                                              |
| `render(ctx)`        | Only for `kind: 'custom'`: returns the step content.                                                                                             |

`ctx` (`StepContext`) exposes `values`, `setFieldValue`, `next()`, `back()`, `goTo(i)`, `submit()`, `submitState` (`idle` \| `submitting` \| `success` \| `error`), `error` and more. If `onSubmit` throws, the error is shown and "Finish" allows a retry.

- **`terms`**: terms text (`content`: text or JSX, scrollable) and/or a link (`href`) plus a required acceptance checkbox (value `termsAccepted`; change it with `acceptName`/`acceptLabel`, or define your own `fields`).
- **`review`**: summary of all previous steps with an "Edit" button per step (passwords masked; options shown by label).
- **`result`**: final screen after `onSubmit`. Step props: `message`, `errorMessage`, `actions: [{ label, href?, onClick? }]`. It appears when the submit finishes (success or error); on error it offers "Retry" and "Back to the form". The last non-`result` step is the one that submits.

### Payments

`kind: 'payment'` charges through a **plugin**. Stripe, Lemon Squeezy, Mercado Pago and PayPal are plugins (see below) and you can write your own with the same `PaymentPlugin` contract. Step props: `provider` (plugin id) or `providers` (the user chooses), `summary` (informative text/JSX) and `resultName` (default `payment`: `{ provider, status, reference }` is stored and travels in `onSubmit`).

```tsx
<ArtisanForm
  scheme={{ steps: [
    { title: 'Plan', fields: [/* … */] },
    { title: 'Payment', kind: 'payment', providers: ['stripe', 'mercadopago'], summary: 'Pro plan' },
    { title: 'Confirmation', kind: 'pending', wait: polling(checkOrder) },
    { title: 'Done', kind: 'result' },
  ] }}
  plugins={{ payments: [stripe({ /* … */ }), mercadopago({ /* … */ })] }}
  persistKey="checkout"   // required for redirect checkouts
  onSubmit={save}
/>
```

- **Embedded** (`mode: 'embedded'`): the plugin mounts the provider's hosted UI (`render({ request, onResult })`).
- **Redirect** (`mode: 'redirect'`): `start(request)` creates the checkout (through your backend) and returns its URL; the user comes back to your page and `resume(params)` reads the result. With `persistKey` the wizard returns to the payment step. `plugins.navigate` replaces `location.assign`.
- Results: `succeeded` advances; `processing` advances so a `pending` step can confirm it (webhook); `failed` shows the error with "Retry" (new `idempotencyKey`), "Choose another payment method" (when there are several) and "Back".

**Security:** the library **never touches card data** (hosted UI or redirect) and the **amount/currency/items are defined and verified by your server** (`PaymentRequest` carries no amounts). Use `idempotencyKey` on your backend to avoid double charges and confirm the real payment through a webhook, not through what the browser reports. `mockPayment()` simulates a provider for demos and tests.

**Your own plugin:**

```ts
const myProvider: PaymentPlugin = {
  id: 'mine', name: 'My provider', mode: 'redirect',
  start: async (req) => ({ url: (await fetch('/api/checkout', { method: 'POST', headers: { 'Idempotency-Key': req.idempotencyKey }, body: JSON.stringify(req.values) }).then(r => r.json())).url }),
  resume: (params) => params.get('status') === 'ok' ? { status: 'succeeded', reference: params.get('ref') ?? undefined } : null,
  resumeKeys: ['status', 'ref'],
};
```

#### Included providers

Each one lives in its own subpath and its SDKs are **optional** `peerDependencies` (install only what you use). All follow the principle above: your backend defines amounts and creates orders/sessions; confirm the real payment through a webhook.

**Stripe** — `import { stripe } from 'artisanform/payments/stripe'` (embedded: `pnpm add @stripe/stripe-js @stripe/react-stripe-js`; hosted Checkout: no SDK).

```tsx
stripe({
  publishableKey: 'pk_test_…',
  // embedded (Payment Element): your backend creates the PaymentIntent and returns the client secret
  createPaymentIntent: (req) => api('/payment-intents', req),            // → { clientSecret }
  // or mode: 'redirect' (Stripe Checkout): your backend creates the session with these URLs
  // createCheckoutSession: (req, { successUrl, cancelUrl }) => api('/checkout', { req, successUrl, cancelUrl }), // → { url }
})
```

**Lemon Squeezy** — `import { lemonSqueezy } from 'artisanform/payments/lemonsqueezy'` (no SDK: the overlay loads `lemon.js` on demand).

```tsx
lemonSqueezy({
  // your backend calls POST /v1/checkouts with your API key and product_options.redirect_url = redirectUrl
  createCheckout: (req, { redirectUrl }) => api('/lemon/checkout', { req, redirectUrl }), // → { url }
  mode: 'redirect', // or 'overlay' (lemon.js modal)
})
```

**Mercado Pago** — `import { mercadoPago } from 'artisanform/payments/mercadopago'` (embedded: `pnpm add @mercadopago/sdk-react`; Checkout Pro: no SDK).

```tsx
mercadoPago({
  publicKey: 'TEST-…',
  // embedded (Payment Brick): your backend creates the payment (POST /v1/payments) with the amount it computed
  createPayment: (req, formData) => api('/mp/payments', { req, formData }),   // → { status, id? }
  brick: { amount: (values) => 1000 },                                         // amount the brick displays (the server is the authority)
  // or mode: 'redirect' (Checkout Pro): your backend creates the preference with these back_urls
  // createPreference: (req, { successUrl, failureUrl, pendingUrl }) => api('/mp/preference', …), // → { url }
})
```

**PayPal** — `import { paypal } from 'artisanform/payments/paypal'` (`pnpm add @paypal/react-paypal-js`).

```tsx
paypal({
  clientId: '…',
  currency: 'USD',
  createOrder: (req) => api('/paypal/orders', req),                    // → { orderId } (amount computed by your server)
  captureOrder: (req, orderId) => api('/paypal/capture', { orderId }),  // → { status: 'COMPLETED' | 'PENDING' | …, id? }
})
```

### Waiting for confirmation

`kind: 'pending'` waits for something external (a service, a webhook) with the `wait` strategy you choose, advances by itself on success and offers "Retry" / "Back to the form" on failure. Props: `wait`, `message`, `resultName` (stores the success `data` in the form), `failTo` (index of the step to return to). With `persistKey`, reloading the page resumes waiting.

| Strategy                                         | Use                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `polling(check, { interval, timeout, backoff })` | Calls `check({ values, signal })` every `interval` ms.                               |
| `sse(url \| (values) => url, { parse, timeout })` | Server-Sent Events; each message is a status (JSON `{ status, message?, data? }`).   |
| `websocket(url \| (values) => url, { parse, timeout })` | Same, over WebSocket.                                                          |
| `callback()`                                     | Returns `{ strategy, update, resolve, fail }`; you decide when it ends.              |

A status is `{ status: 'pending' \| 'success' \| 'failed', message?, data? }`. For another source, implement `WaitStrategy.subscribe(onStatus, { values, signal })`.

### Files and storage

`file` and `image` fields (with previews) upload each file as soon as it is chosen and store a **serializable descriptor** (`{ id, name, size, type, url? }`) in the form, not the `File`. Field props: `accept`, `maxSize` (bytes), `maxFiles` (1 replaces; more allows several), `minFiles`, `capture`, `storage` (adapter key). There is drag and drop, progress, cancel, retry and remove; "Next" waits until uploads finish.

You define the destination with the `storage` prop (one adapter, or `{ key: adapter }` and `storage: 'key'` on the field). The library **never holds credentials**: your backend signs.

```tsx
import { ArtisanForm, presignedPut, cloudinary } from 'artisanform';

// S3, Cloudflare R2, Backblaze B2, MinIO… (any S3-compatible service)
const s3 = presignedPut({
  getUploadUrl: async (file) => {
    const r = await fetch('/api/upload-url', { method: 'POST', body: JSON.stringify({ name: file.name, type: file.type }) });
    return r.json(); // { url, headers?, fileUrl?, id? }
  },
});

// Cloudinary: unsigned preset, or signed by your backend (getSignature)
const cl = cloudinary({ cloudName: 'demo', uploadPreset: 'my_unsigned_preset' });

<ArtisanForm scheme={scheme} storage={{ default: s3, images: cl }} onSubmit={save} />;
```

**Your own plugin:** any `StorageAdapter` object (`{ id, upload(file, { onProgress, signal }) → UploadedFile, remove? }`) works for another service. `mockStorage()` simulates uploads for demos and tests.

> Type and size validation in the browser is UX only: the server must validate the real MIME type and size, and scan the files.

### Custom field types

Each type is a `FieldDefinition` (`render`, `initialValues`, `rules`, and optionally `groupLabel`/`secret`). The built-in ones are in `defaultFieldRegistry`; add yours with the `fields` prop:

```tsx
<ArtisanForm
  scheme={{ steps: [{ title: 'X', fields: [{ type: 'stars', name: 'rating', label: 'Rating' }] }] }}
  fields={{
    stars: {
      initialValues: (f) => ({ [f.name]: 3 }),
      rules: () => ({}),
      render: (f) => <MyStars name={f.name} label={f.label} />,
    },
  }}
  onSubmit={console.log}
/>
```

### `ArtisanForm` props

| Prop                          | Description                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scheme`                      | The form definition (required): a 0.2.0 `FormSchema` or an `ArtisanSchemaV1`                                                                     |
| `onSubmit(values)`            | Called on finish. If it returns a promise, "Finish" stays disabled until it settles                                                              |
| `initialValues?`              | Initial values by field name; they override the scheme's `defaultValue`s                                                                         |
| `onChange?(values)`           | Called with all values on every change                                                                                                           |
| `onStepChange?(step)`         | Called with the index of the new step                                                                                                            |
| `step?`                       | Moves the wizard to that step when it changes (pair with `onStepChange`)                                                                         |
| `persistKey?`                 | Saves values and step to `localStorage` and restores them on mount. Passwords are never saved; the draft is deleted on submit                    |
| `onSnapshotConflict?`         | What to do with a saved draft that does not fit this form: `'backup'` (default), `'restore'` or `'discard'`                                       |
| `labels?`                     | Overrides any text or validation message (see `defaultLabels`; English by default)                                                               |
| `className?`                  | Extra classes for the `<form>` element                                                                                                           |
| `fields?`                     | Registry of custom field types (see above)                                                                                                       |
| `stepTypes?`                  | Registry of custom step types (`StepDefinition`)                                                                                                 |
| `extensions?`                 | Local functions and components a v1 schema refers to by id (`options`, `waits`, `hooks`, `renderers`, `actions`)                                 |
| `storage?`                    | Storage adapter(s) for `file`/`image` fields (see above)                                                                                         |
| `plugins?`                    | `{ payments: PaymentPlugin[], navigate? }` for payment steps                                                                                     |

### Wizard behavior

- **Next** validates only the current step's fields and shows their errors; it does not advance if there are any.
- **Finish** (last step) validates everything and calls `onSubmit` with the values.
- `isFinalStep` is computed from the number of steps; when the scheme's content changes the wizard returns to step 0.

## Styles

The components use Tailwind classes. There are two ways to load them:

1. **With Tailwind in your project (recommended):** add the library build to `content` in `tailwind.config.js` so Tailwind generates its classes.

   ```js
   content: ['./src/**/*.{js,ts,jsx,tsx}', './node_modules/artisanform/dist/**/*.{js,cjs}'],
   ```

2. **Without Tailwind:** import the precompiled CSS (it includes Tailwind's `preflight` reset).

   ```ts
   import 'artisanform/style.css';
   ```

### Customization

- **Brand color:** define these CSS variables (fallbacks: Tailwind blue):

  ```css
  :root {
    --artisan-primary: #7c3aed;
    --artisan-primary-dark: #5b21b6;
  }
  ```

- **Extra classes:** every component accepts `className` (`Controls` also `buttonClassName`; `ArtisanForm` applies it to the `<form>`).

## Installation

`react`, `react-dom`, `react-hook-form`, `yup` and `zustand` are `peerDependencies`:

```bash
pnpm add artisanform react react-dom react-hook-form yup zustand
```

## Public API (`src/index.ts`)

`ArtisanForm`, `StandaloneForm`, the standalone inputs (`TextInput`, `Textarea`, `Password`, `DateInput`, `Select`, `DynamicSelect`, `Check`, `Radio`), `defaultFieldRegistry`, `defaultStepRegistry`, `defineForm`, `parseArtisanSchema`, `normalizeArtisanSchema`, `evaluateCondition`, `presignedPut`, `cloudinary`, `mockStorage`, `polling`, `sse`, `websocket`, `callback`, `mockPayment`, `useArtisanStore`, `cn`, `defaultLabels` and the types (`ArtisanSchemaV1`, `FormSchema`, `StepSchema`, `FieldSchema`, `FieldDefinition`, `StepDefinition`, `ArtisanExtensions`, `ArtisanSnapshotV1`, `StorageAdapter`, `PaymentPlugin`, `WaitStrategy`, `ArtisanLabels`…). Payment plugins are imported from `artisanform/payments/<provider>`.

Standalone inputs bind to the form by `name` (not `value`/`onChange`) and **must be rendered inside a `<StandaloneForm initialValues schema onSubmit>`** (exported by the library; `ArtisanForm` does not need it). You never touch React Hook Form directly. They show the Yup error once the field has been touched.

## Structure

```
.
├── .github/                 Issue and PR templates
├── .storybook/              Storybook config + withForm (stories decorator)
├── docs/                    Guides (English); docs/es/ has the Spanish versions
├── e2e/                     Playwright tests (against the playground)
├── playground/              React test app; scenarios in src/scenarios/
├── src/
│   ├── schema/              Public v1 contract: contract/, legacy/ (0.2.0 adapter), parser, normalize
│   ├── persistence/         Versioned draft snapshots
│   ├── engine/              Runs a schema: projection, validation, drafts, step state
│   ├── components/
│   │   ├── ArtisanForm/     ArtisanForm, Wizard, Stepper
│   │   ├── Controls/        Previous / Next / Finish buttons
│   │   ├── inputs/          One component per input type (+ stories)
│   │   ├── fields/          Field registry (render, values, rules per type)
│   │   └── steps/           Step registry + PaymentStep, StatusPanel
│   ├── integrations/
│   │   ├── payments/        PaymentPlugin, mock and providers (stripe, lemonsqueezy, mercadopago, paypal)
│   │   ├── storage/         StorageAdapter, presignedPut, cloudinary, mock
│   │   └── wait/            WaitStrategy: polling, sse, websocket, callback
│   ├── commons/             cn, labels, theme
│   └── index.ts             Library entry
├── AGENTS.md                Working agreements (humans and agents)
└── vite.config.ts · tailwind.config.js · tsconfig.json · biome.jsonc · playwright.config.ts
```

## Project status

### Done

- A `scheme`-driven wizard with per-step validation (React Hook Form + Yup), conditionals, drafts (`persistKey`), `labels`, theming and accessibility.
- 30+ field types (text, dates, selection, combobox, files, repeatable rows, content) and a registry for custom types.
- Step engine with `terms`, `payment`, `pending`, `review`, `result` and `custom`.
- Files: `StorageAdapter` + adapters for S3/R2/Backblaze (presigned URL) and Cloudinary.
- Payments: `PaymentPlugin` contract and Stripe, Lemon Squeezy, Mercado Pago and PayPal plugins.
- Waiting: `WaitStrategy` with polling, SSE, WebSocket and callback.
- **Schema v1 (Phase 1):** serializable, versioned contract, declarative conditions, structural parser, normalization with a 0.2.0 adapter, id-based extensions and versioned draft snapshots ([guide](docs/schema-v1.md)).
- Biome (format + lint), a live playground, unit tests (`bun test`) and e2e tests (Playwright).

### Pending

- **GitHub CI (AF8):** the workflow is on the local branch `chore/AF8-ci`; pushing it needs the token's `workflow` scope (`gh auth refresh -s workflow`).
- **Release:** `develop` → `master`, publish the package (registry to be decided) and deploy Storybook.
- **Real providers:** the plugins are verified against mocks of their SDKs; they still need a pass against sandboxes with test credentials.
- **Default UI for `ui` settings:** `layout`, `density`, `labelPosition` and `variant` are validated and normalized but not interpreted yet.
- **Browser:** component tests run in happy-dom; Playwright covers the playground flows (wizard, files, waiting, mock payments, fields).
- Default texts are English only; for another language pass `labels` (and write your own field labels).

### History

| Branch                         | Content                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| AF1 `create-control-component` | Store, `cn` and `Controls`                                                                               |
| AF2 `add-inputs`               | Inputs, stories and Prettier                                                                             |
| AF3 `export-api`               | Public exports and library build                                                                         |
| AF4 `formik-yup`               | Inputs integrated with Formik/Yup                                                                        |
| AF5 `artisan-form`             | `ArtisanForm` container and `scheme`                                                                     |
| AF6 `dynamic-select`           | `DynamicSelect` with Formik and `scheme` support                                                         |
| AF7 `cleanup-readme`           | Boilerplate cleanup and documentation                                                                    |
| AF9–AF20                       | Distributable CSS, peer deps, per-instance state, API, accessibility, labels, theming, conditionals, async options, drafts |
| AF22–AF23                      | Biome; playground and Playwright                                                                         |
| AF24–AF28                      | Field registry, basic fields, step engine, result/review, terms                                          |
| AF29–AF30                      | File fields with StorageAdapter; waiting step                                                            |
| AF31–AF35                      | Payments core and Stripe, Lemon Squeezy, Mercado Pago, PayPal plugins                                    |
| AF36–AF37                      | Content/advanced fields and repeatable rows                                                              |
| AF44–AF49                      | Schema v1 contract, parser, normalization, integration, snapshots and documentation                      |
| AF50                           | English as the project language; Spanish docs under `docs/es`                                            |

## Workflow

Details in [AGENTS.md](AGENTS.md) ([Spanish](docs/es/AGENTS.md)). Summary:

- `master` stable, `develop` integration; never commit directly to either.
- One feature = one branch = one PR from `develop`: `feat/AF<n>-slug`, `fix/AF<n>-slug`, `chore/slug` (`AF<n>` = issue number).
- PRs go to `develop` with the [template](.github/PULL_REQUEST_TEMPLATE.md); `develop` → `master` only for releases.
- Commits: `type: :emoji: description`, in English.
- Before the PR: `pnpm lint`, `pnpm typecheck`, `pnpm build` and `bun test` clean, and the story updated.

## Conventions

- Biome: 2 spaces, single quotes, `;`, trailing comma `all`, 80 columns, LF.
- One component per folder with its `*.stories.tsx`; `export default`.
- Inputs with `forwardRef` when they expose an element, the `useArtisanField` binding and basic accessibility (`label htmlFor`, `aria-invalid`, `aria-describedby`).
- Styles only with Tailwind + `cn()`. Global state only in `useArtisanStore`.
- Everything generated in the repository (code, comments, docs, commits) is in English; Spanish documentation lives in `docs/es/`. Library texts are never hard-coded: built-in defaults are English and every one is overridable through `labels`.
