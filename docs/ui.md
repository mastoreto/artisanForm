# UI architecture and customization

> 🌐 Spanish version: [es/ui.md](es/ui.md)

The schema says **what** the form is, the engine decides **how** it behaves, and the renderer decides **how it looks**. This guide covers the renderer: how to restyle the default UI, replace any part of it, and plug in other UI libraries, without touching the engine.

## Layers

| Layer | Owns | Never owns |
| --- | --- | --- |
| Schema (`ArtisanSchemaV1`) | steps, fields, conditions, validation rules, semantic `ui` | components, CSS |
| Engine (`src/engine`, `useWizard`) | values, validation, navigation, drafts, async operations | colors, layout |
| Renderer (`Wizard`, step and field registries) | which component shows what, grid, errors, progress | validation, navigation |
| UI components (`src/components/inputs`, `ui`, `Controls`, `Stepper`…) | markup and styles | form state |

`useWizard` (internal, `src/components/ArtisanForm/useWizard.ts`) holds all the wizard behavior and `Wizard` only renders what it returns. A public headless API (`useArtisanForm`) is **not** published yet; see [Pending](#pending).

## Three levels of customization

Use one or mix them; each works with any CSS approach (plain CSS, SCSS, Less, CSS Modules, CSS-in-JS, Tailwind).

1. **Tokens**: change the look of the default UI with CSS variables.
2. **`classNames` / `unstyled`**: add your classes to each part, or drop the library classes.
3. **`components`**: replace whole parts (inputs by field type, Stepper, Controls…).

### 1. Default styles and tokens

`import 'artisanform/style.css'` loads plain CSS (no Tailwind, no reset of your app). Every rule is a single `.af-*` class; state comes from `data-*`/`aria-*` attributes. Theme it with variables (all have fallbacks):

```css
:root {
  --artisan-primary: #7c3aed;
  --artisan-primary-dark: #5b21b6;
  --artisan-radius: 0.75rem;
  --artisan-border: #c4b5fd;
  --artisan-error: #be123c;
  --artisan-text: #1f2937;
  --artisan-muted: #6b7280;
  --artisan-subtle: #f3f4f6;
  --artisan-surface: #fff;
  --artisan-gap: 1rem;
  --artisan-font: inherit;
}
```

### 2. `classNames` and `unstyled`

```tsx
// Tailwind (or any CSS): your classes are added to the defaults
<ArtisanForm scheme={scheme} onSubmit={save}
  classNames={{ input: 'rounded-full border-emerald-400', button: 'bg-emerald-600' }} />

// Start from scratch: no `af-*` classes, only yours
<ArtisanForm scheme={scheme} onSubmit={save} unstyled
  classNames={{ input: 'my-input', label: 'my-label', controls: 'my-controls', button: 'my-button' }} />
```

Slots (`ARTISAN_SLOTS`): `root`, `stepper`, `stepperList`, `stepperItem`, `stepHeader`, `fieldGrid`, `fieldCell`, `field`, `label`, `groupLabel`, `description`, `error`, `input`, `inputWrap`, `adornment`, `select`, `selectWrap`, `selectIcon`, `choiceGroup`, `choice`, `switch`, `switchThumb`, `checkbox`, `chipList`, `chip`, `comboWrap`, `listbox`, `option`, `optionHint`, `otpGroup`, `otpBox`, `rating`, `star`, `range`, `rangeValue`, `dropzone`, `fileList`, `fileItem`, `fileName`, `fileThumb`, `progress`, `progressBar`, `link`, `smallButton`, `arrayList`, `arrayItem`, `arrayItemHeader`, `arrayItemTitle`, `arrayRow`, `controls`, `button`, `action`, `formError`, `status`, `statusIcon`, `statusTitle`, `statusMessage`, `statusActions`, `spinner`, `callout`, `heading`, `paragraph`, `divider`, `review`, `reviewList`, `reviewRow`, `terms`, `stack`, `dependent`, `dateRange`, `text`, `muted`, `srOnly`. Each renders as `af-<kebab-case>`; the `srOnly` class is always kept (screen-reader text must stay hidden).

Specificity: the library's selectors are single classes, so they beat element resets (e.g. Tailwind's preflight) and your own class overrides them when it is loaded later or is more specific.

### 3. `components`

```tsx
<ArtisanForm
  scheme={scheme}
  onSubmit={save}
  components={{
    inputs: { text: MyText, select: MySelect },   // by field `type`
    FieldWrapper: MyField,                         // label + description + error around every field
    Stepper: MyStepper,
    Controls: MyControls,
    StepHeader: MyStepHeader,                      // optional
    FormError: MyFormError,                        // optional
  }}
/>
```

Everything is optional and falls back to the default UI. `components` is a prop (local code): a JSON schema can never carry a component.

#### Input contract: `ArtisanInputProps<TValue>`

A replacement input never sees React Hook Form or Zustand:

| Prop | Meaning |
| --- | --- |
| `id`, `name` | the field's identity (`id` = `name`) |
| `value`, `onChange(value)`, `onBlur()` | controlled value, already normalized |
| `disabled`, `readOnly`, `required` | from the schema |
| `label`, `description`, `placeholder`, `options` | from the schema |
| `error` | `{ code, message }` once the field was touched (or "Next" was tried) and is invalid; `code` is the rule that failed (`required`, `min`, `typeError`…) |
| `aria` | `{ 'aria-invalid', 'aria-describedby' }`: spread it on your control |
| `descriptionId`, `errorId` | ids to give to your description / error elements |
| `field` | the field definition, read-only (extras such as `mask`, `min`, `uiVariant`) |

`value` types by `type`: `text/email/tel/url/password/textarea/date/time/datetime/month/select/radio/combobox/otp` → `string`; `number/range/rating` → `number | string`; `checkbox/switch` → `boolean`; `check/multiselect` → `string[]`.

Not replaceable through `components.inputs` (several values or their own state): `array`, `file`/`image`, `dynamicSelect`, `daterange`. Provide those through the `fields` registry.

#### Component props

- `FieldWrapper`: `{ id, label, description?, error?, invalid, className?, children }`. When you provide it, the default inputs skip their own label/description/error, and a replacement input should render only the control.
- `Stepper`: `{ steps: { id, title, state: 'done' | 'current' | 'upcoming' }[], current, labels }`. Navigation is driven by the engine: a stepper displays progress, it does not jump between steps.
- `Controls`: `{ onNext, onPrevious, isFirst, isLast, isSubmitting, nextDisabled?, hidePrevious?, hideNext?, error, labels }`. `onNext` validates, runs `beforeNext` and moves on (or submits on the last step).
- `StepHeader`: `{ title, index, total }`. `FormError`: `{ message }`.

#### Accessibility responsibilities

The default UI associates labels, sets `aria-invalid`/`aria-describedby`, announces step changes and moves focus to the first invalid field. A replacement keeps that working by:

- giving the control `id` and a `<label htmlFor={id}>` (or letting a `FieldWrapper` do it),
- spreading `aria` on the control (`aria-invalid` is also how focus finds the first invalid field),
- rendering `description` / `error` with `descriptionId` / `errorId` (errors with `role="alert"` or `aria-live`),
- exposing progress in a custom `Stepper` (for example `aria-current="step"`).

## Semantic `ui` settings

The schema's `ui` is interpreted by the default renderer and never contains CSS:

| Where | Setting | Effect |
| --- | --- | --- |
| form | `density: 'compact' \| 'comfortable'` | `data-density` on the root; compact tightens field spacing |
| form | `labelPosition: 'top' \| 'left'` | `data-label-position`; `left` puts labels in a column next to the control |
| form | `layout: 'vertical' \| 'horizontal'` | `data-layout` on the root (styling hook; no built-in rule yet) |
| step | `columns: 1 \| 2` | grid columns (1 column on small screens regardless) |
| field | `span: 1 \| 2` | columns spanned in a 2-column step (legacy `width: 'half'` ⇒ `span: 1`) |
| field | `variant: string` | not used by the default UI; reaches a custom component as `field.uiVariant` |

The grid collapses to one column on narrow screens without any configuration in the schema.

## Custom fields and steps

Types the library does not ship are registered locally and referenced by name from the schema (JSON included):

```tsx
const fields: FieldRegistry = {
  satisfaction: {                          // schema: { "type": "x-satisfaction", ... }
    initialValues: (f) => ({ [f.name]: '' }),
    rules: () => ({}),                      // Yup rules per value name
    render: (f, ctx) => <MyRating name={f.name} label={f.label} />,
    // secret?: true  → never written to drafts
  },
};
<ArtisanForm scheme={json} fields={fields} />
```

An entry without `render`, `initialValues` or `rules` throws at mount, naming the type. An unknown `type` renders a visible alert instead of crashing.

Custom steps use `stepTypes` and the stable `api` of the step context (`ArtisanStepApi`):

| `api` | |
| --- | --- |
| `step` | `{ id, title, kind, index, total }` |
| `values` | current values (read-only) |
| `setValue(name, value)` | only names the step owns (its fields and `resultName`); any other name throws |
| `errors` | validation messages of the step's fields |
| `next()`, `back()` | navigation through the engine's rules (validation, `beforeNext`, submit on the last step) |
| `submitState`, `submitError`, `error`, `labels` | status |

The rest of `StepContext` (`goTo`, `submit`, the store-derived data) remains for compatibility but bypasses validation: prefer `api` in new code. `useArtisanStore` is an internal detail and not a stable contract.

## Compatibility

- `<ArtisanForm scheme onSubmit />` works unchanged; `components`, `classNames` and `unstyled` are opt-in.
- Schemas 0.2.0 and v1, the field and step registries, the exported inputs and `Controls`, callbacks, validation, drafts, payments, storage and waits are unchanged.
- The default stylesheet is now plain CSS (no Tailwind classes and no global reset). If you relied on `artisanform/style.css` shipping Tailwind's preflight, add your own reset.
- `cn()` is now a thin `clsx` wrapper (no `tailwind-merge`).

## Pending

- **Headless API.** `useWizard` already contains all the behavior; what is missing is a stable public shape. Proposal for the next phase: `useArtisanForm({ scheme, onSubmit, ... })` returning `{ steps, step, fields, values, errors, next, back, submitState }`, with `fields` carrying the same `ArtisanInputProps` used by `components.inputs`. It is not exported because it would freeze the engine's choices (React Hook Form, Zustand, drafts) one phase after they changed.
- `layout: 'horizontal'` has no built-in styling (only the `data-layout` hook).
- A stepper cannot navigate to earlier steps; that needs a "visited and valid" notion in the engine.
