# API headless: `useArtisanWizard`

> 🌐 Versión en español de [headless.md](../headless.md).

`ArtisanForm` se compone de dos piezas: `useArtisanWizard` (comportamiento: valores, validación, condiciones, navegación, borradores, pagos, esperas) y un renderer. El hook es público, así que podés dibujar tu propia UI y conservar todo el comportamiento. No hay un segundo motor: `ArtisanForm` mismo se dibuja desde este hook.

```tsx
import {
  ArtisanWizardProvider,
  useArtisanWizard,
  useArtisanField,
} from 'artisanform/headless'; // sin hoja de estilos; también se exporta desde 'artisanform'

const Checkout = () => {
  const wizard = useArtisanWizard({ schema, extensions, onSubmit });
  const { current, bindForm } = wizard; // desestructurá antes de usarlo como ref
  return (
    <ArtisanWizardProvider wizard={wizard}>
      <form ref={bindForm} onSubmit={(e) => { e.preventDefault(); void wizard.next(); }}>
        <h2>{current?.title}</h2>
        {current?.fields.map((f) => <MyField key={f.name} field={f} />)}
        <button type="button" onClick={wizard.back} disabled={wizard.isFirst}>Atrás</button>
        <button type="submit">{wizard.isLast ? 'Finalizar' : 'Siguiente'}</button>
      </form>
    </ArtisanWizardProvider>
  );
};
```

## Opciones

Las mismas de `ArtisanForm` sin las props de UI, con `schema` en vez de `scheme`: `schema`, `extensions`, `onSubmit`, `initialValues`, `persistKey`, `onSnapshotConflict`, `onStepChange`, `onChange`, `step`, `labels`, `fields`, `stepTypes`, `storage`, `plugins`.

## Qué devuelve (`ArtisanWizard`)

| Propiedad | Qué es |
| --- | --- |
| `form` | La instancia de React Hook Form. Salida documentada: `form.control`, `form.watch`… Guarda todos los valores. |
| `steps`, `step` | Pasos visibles (`{ id, title, kind, state }`) y el índice actual entre ellos. |
| `current` | `{ id, index, kind, title, fields }` (`fields` son los visibles ahora) o `null`. |
| `next()` | Valida el paso, corre `beforeNext` y avanza (o envía en el último paso). |
| `back()`, `goTo(index)`, `submit()` | Navegación y envío. `submit()` no valida el paso. |
| `isFirst`, `isLast` | Para tus botones. |
| `submitState`, `submitError`, `stepError` | `idle \| submitting \| success \| error` y los mensajes. |
| `renderStep()`, `controls`, `bindForm`, `labels`, `ui` | Lo que usa el renderer por defecto: dibuja un paso con su tipo registrado (pago, espera, resumen…), los controles por defecto del paso, un `ref` (callback) para el `<form>` (el foco va al primer campo inválido), los textos combinados y la config `ui` del formulario. |

Los inputs se enlazan al formulario con `useArtisanField(name)` (dentro de `ArtisanWizardProvider`) o directamente con `wizard.form` (`Controller`, `register`). Los pasos y campos ocultos se saltan y nunca se envían, igual que en `ArtisanForm`.

## Notas

- **Llamalo una vez por formulario.** No dibujes un `ArtisanForm` y un `useArtisanWizard` para el mismo schema.
- **Desestructurá `bindForm` antes de usarlo como `ref`.** `eslint-plugin-react-hooks` (reglas del React Compiler) marca como acceso a un ref cada lectura posterior de `wizard.*` si escribís `ref={wizard.bindForm}` directamente.
- **Los pasos incluidos** (`payment`, `pending`, `terms`, `review`, `result`) se dibujan con `renderStep()` y usan las partes de UI por defecto (clases `af-*`). En una UI totalmente propia, dibujá esos pasos vos o registrá tus propios `stepTypes`.
- **Tamaño.** `artisanform/headless` no trae hoja de estilos, pero comparte un chunk con la entrada raíz (motor, schema y registry de campos viven juntos), así que no es mucho más chico: medido en este build, `headless.js` 412 B gzip + el chunk compartido 40,134 B gzip; el `index.js` raíz son 6,575 B gzip + el mismo chunk.
- El estado de pasos vive en un store de Zustand creado por cada llamada a `useArtisanWizard`; `useArtisanStore` solo lo lee dentro del provider.
