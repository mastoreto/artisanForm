# Headless API: `useArtisanWizard`

Spanish version: [es/headless.md](es/headless.md).

`ArtisanForm` is built from two pieces: `useArtisanWizard` (behavior: values, validation, conditions, navigation, drafts, payments, waiting) and a renderer. The hook is public, so you can render your own UI and keep all the behavior. There is no second engine: `ArtisanForm` itself renders from this hook.

```tsx
import {
  ArtisanWizardProvider,
  useArtisanWizard,
  useArtisanField,
} from 'artisanform/headless'; // no stylesheet; also exported from 'artisanform'

const Checkout = () => {
  const wizard = useArtisanWizard({ schema, extensions, onSubmit });
  const { current, bindForm } = wizard; // destructure before using it as a ref
  return (
    <ArtisanWizardProvider wizard={wizard}>
      <form ref={bindForm} onSubmit={(e) => { e.preventDefault(); void wizard.next(); }}>
        <h2>{current?.title}</h2>
        {current?.fields.map((f) => <MyField key={f.name} field={f} />)}
        <button type="button" onClick={wizard.back} disabled={wizard.isFirst}>Back</button>
        <button type="submit">{wizard.isLast ? 'Finish' : 'Next'}</button>
      </form>
    </ArtisanWizardProvider>
  );
};
```

## Options

The same as `ArtisanForm` minus the UI props, with `schema` instead of `scheme`: `schema`, `extensions`, `onSubmit`, `initialValues`, `persistKey`, `onSnapshotConflict`, `onStepChange`, `onChange`, `step`, `labels`, `fields`, `stepTypes`, `storage`, `plugins`.

## What it returns (`ArtisanWizard`)

| Property | What it is |
| --- | --- |
| `form` | The React Hook Form instance. Documented escape hatch: `form.control`, `form.watch`… It holds all the values. |
| `steps`, `step` | Visible steps (`{ id, title, kind, state }`) and the current index among them. |
| `current` | `{ id, index, kind, title, fields }` (`fields` are the ones visible now) or `null`. |
| `next()` | Validates the step, runs `beforeNext`, then moves on (or submits on the last step). |
| `back()`, `goTo(index)`, `submit()` | Navigation and submit. `submit()` bypasses step validation. |
| `isFirst`, `isLast` | For your buttons. |
| `submitState`, `submitError`, `stepError` | `idle \| submitting \| success \| error` and the messages. |
| `renderStep()`, `controls`, `bindForm`, `labels`, `ui` | What the default renderer uses: render a step with its registered step type (payment, pending, review…), the step's default controls, a callback `ref` for the `<form>` so focus moves to the first invalid field, the merged labels and the form's `ui` settings. |

Inputs bind to the form through `useArtisanField(name)` (inside `ArtisanWizardProvider`) or directly through `wizard.form` (`Controller`, `register`). Hidden steps and fields are skipped and never submitted, exactly as in `ArtisanForm`.

## Notes

- **Call it once per form.** Do not render an `ArtisanForm` and a `useArtisanWizard` for the same schema.
- **Destructure `bindForm` before using it as `ref`.** `eslint-plugin-react-hooks` (React Compiler rules) reports every later read of `wizard.*` as a ref access if you write `ref={wizard.bindForm}` directly.
- **Built-in steps** (`payment`, `pending`, `terms`, `review`, `result`) render through `renderStep()` and use the default UI parts (`af-*` classes). In a fully custom UI, render those steps yourself or register your own `stepTypes`.
- **Bundle.** `artisanform/headless` has no stylesheet, but it shares one chunk with the root entry (the engine, the schema and the field registry live together), so it is not much smaller: measured on this build, `headless.js` 412 B gzip + the shared chunk 40,134 B gzip; the root `index.js` is 6,575 B gzip + the same chunk.
- The step state lives in a Zustand store created per `useArtisanWizard` call; `useArtisanStore` reads it only inside the provider.
